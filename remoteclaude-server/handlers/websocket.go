package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"remoteclaude/utils"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin (for development)
		return true
	},
}

type Client struct {
	conn      *websocket.Conn
	send      chan []byte
	sessionID string
	platform  string
}

type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mu         sync.RWMutex
}

var hub = &Hub{
	clients:    make(map[*Client]bool),
	register:   make(chan *Client),
	unregister: make(chan *Client),
	broadcast:  make(chan []byte, 256),
}

type Message struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data,omitempty"`
	Status    string      `json:"status,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	SessionID string      `json:"session_id,omitempty"`
}

type AuthRequest struct {
	Type       string `json:"type"`
	Token      string `json:"token,omitempty"`
	ClientInfo struct {
		Platform string `json:"platform"`
		Version  string `json:"version"`
	} `json:"client_info"`
}

type AuthResponse struct {
	Type      string `json:"type"`
	Status    string `json:"status"`
	SessionID string `json:"session_id,omitempty"`
	Token     string `json:"token,omitempty"`
	Message   string `json:"message,omitempty"`
}

func init() {
	go hub.run()
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client connected: %s (%s)", client.sessionID, client.platform)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client disconnected: %s", client.sessionID)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					delete(h.clients, client)
					close(client.send)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
	}

	// Handle authentication first
	if !authenticateClient(client, r.RemoteAddr) {
		conn.Close()
		return
	}

	// Register client and start goroutines
	hub.register <- client

	go client.writePump()
	go client.readPump()
}

func authenticateClient(client *Client, remoteAddr string) bool {
	// Wait for authentication message
	var authReq AuthRequest
	err := client.conn.ReadJSON(&authReq)
	if err != nil {
		log.Printf("Failed to read auth message: %v", err)
		return false
	}

	if authReq.Type == "auth" {
		// Generate new session
		sessionID := utils.GenerateSessionID()
		token, err := utils.GenerateJWT(sessionID, remoteAddr, authReq.ClientInfo.Platform)
		if err != nil {
			log.Printf("Failed to generate JWT: %v", err)
			client.conn.WriteJSON(AuthResponse{
				Type:    "auth_result",
				Status:  "failed",
				Message: "Failed to generate authentication token",
			})
			return false
		}

		client.sessionID = sessionID
		client.platform = authReq.ClientInfo.Platform

		// Send success response
		client.conn.WriteJSON(AuthResponse{
			Type:      "auth_result",
			Status:    "success",
			SessionID: sessionID,
			Token:     token,
		})

		return true
	}

	client.conn.WriteJSON(AuthResponse{
		Type:    "auth_result",
		Status:  "failed",
		Message: "Invalid authentication request",
	})
	return false
}

func (c *Client) readPump() {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg Message
		err := c.conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle different message types
		handleMessage(c, &msg)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func handleMessage(client *Client, msg *Message) {
	switch msg.Type {
	case "claude_execute":
		handleClaudeExecute(client, msg)
	case "git_operation":
		handleGitOperation(client, msg)
	case "ping":
		sendMessage(client, Message{
			Type:      "pong",
			Timestamp: time.Now(),
		})
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func sendMessage(client *Client, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}
	
	select {
	case client.send <- data:
	default:
		close(client.send)
		delete(hub.clients, client)
	}
}

// BroadcastMessage sends a message to all connected clients
func BroadcastMessage(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal broadcast message: %v", err)
		return
	}
	
	select {
	case hub.broadcast <- data:
	default:
		log.Printf("Broadcast channel full, message dropped")
	}
}