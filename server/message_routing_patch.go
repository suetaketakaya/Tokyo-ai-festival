package main

import "log"

// Message routing patch to integrate staged execution

// This patch modifies the existing message handling to support staged execution

/*
Add this case to the existing switch statement in handleMessage function:

case "claude_execute_staged":
	s.handleDockerClaudeExecuteStaged(conn, msg)

And optionally modify the existing "claude_execute" to use staging by default:

case "claude_execute":
	// Check if client supports staging (based on version or preference)
	data, ok := msg["data"].(map[string]interface{})
	if ok {
		clientVersion, _ := data["client_version"].(string)
		useStaging := shouldUseStaging(clientVersion)

		if useStaging {
			log.Printf("🔄 Auto-routing to staged execution for client version: %s", clientVersion)
			s.handleDockerClaudeExecuteStaged(conn, msg)
		} else {
			s.handleDockerClaudeExecute(conn, msg)
		}
	} else {
		s.handleDockerClaudeExecute(conn, msg)
	}
*/

// Helper function to determine if staging should be used
func shouldUseStaging(clientVersion string) bool {
	// For now, always use staging for compatible clients
	// In the future, this could be based on version or user preferences

	if clientVersion == "" {
		return false // Legacy clients
	}

	// Enable staging for version 3.8.0 and above
	if clientVersion >= "3.8.0" {
		return true
	}

	return false
}

// Function to apply the message routing patch
func (s *Server) applyMessageRoutingPatch() {
	log.Printf("🔧 Applying message routing patch for staged execution...")

	// This would be integrated into the main handleMessage function
	// For now, we create the handlers that can be manually integrated

	log.Printf("✅ Staged execution handlers ready for integration")
}

/*
INTEGRATION INSTRUCTIONS:
========================

1. In main.go, find the handleMessage function (around line 400-500)

2. Add the following case to the switch statement:

case "claude_execute_staged":
	s.handleDockerClaudeExecuteStaged(conn, msg)

3. Optionally modify the existing "claude_execute" case to:

case "claude_execute":
	// Enhanced routing with staging support
	data, ok := msg["data"].(map[string]interface{})
	if ok {
		// Check if staging is explicitly requested
		if useStaging, exists := data["use_staging"].(bool); exists && useStaging {
			log.Printf("🎯 Explicit staging requested")
			s.handleDockerClaudeExecuteStaged(conn, msg)
			return
		}

		// Auto-detect based on client version
		if clientVersion, ok := data["client_version"].(string); ok && shouldUseStaging(clientVersion) {
			log.Printf("🔄 Auto-routing to staged execution")
			s.handleDockerClaudeExecuteStaged(conn, msg)
			return
		}
	}

	// Fallback to original handler
	s.handleDockerClaudeExecute(conn, msg)

4. Add imports if needed:
   - Make sure staged_executor.go and staged_handler_patch.go are included

5. Test with a message like:
{
  "type": "claude_execute_staged",
  "data": {
    "project_id": "test-project",
    "command": "Create a Python visualization",
    "client_version": "3.8.0"
  }
}
*/