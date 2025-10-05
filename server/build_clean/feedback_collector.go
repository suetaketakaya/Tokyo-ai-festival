package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"
)

// UserFeedback represents user feedback on a prediction
type UserFeedback struct {
	ID                string    `json:"id"`
	Timestamp         time.Time `json:"timestamp"`
	Command           string    `json:"command"`
	PredictedCategory string    `json:"predicted_category"`
	PredictedConf     float64   `json:"predicted_confidence"`
	ActualCategory    string    `json:"actual_category"`
	UserRating        int       `json:"user_rating"` // 1-5 stars
	IsCorrect         bool      `json:"is_correct"`
	UserComment       string    `json:"user_comment"`
	SessionID         string    `json:"session_id"`
	Metadata          map[string]interface{} `json:"metadata"`
}

// FeedbackCollector manages user feedback collection and storage
type FeedbackCollector struct {
	feedbackFile string
	mutex        sync.Mutex
	feedbacks    []UserFeedback
}

// NewFeedbackCollector creates a new feedback collector
func NewFeedbackCollector(feedbackFile string) *FeedbackCollector {
	fc := &FeedbackCollector{
		feedbackFile: feedbackFile,
		feedbacks:    []UserFeedback{},
	}
	fc.loadFeedback()
	return fc
}

// loadFeedback loads existing feedback from file
func (fc *FeedbackCollector) loadFeedback() {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	if _, err := os.Stat(fc.feedbackFile); os.IsNotExist(err) {
		log.Printf("📝 No existing feedback file, creating new one")
		return
	}

	data, err := os.ReadFile(fc.feedbackFile)
	if err != nil {
		log.Printf("⚠️ Failed to read feedback file: %v", err)
		return
	}

	if err := json.Unmarshal(data, &fc.feedbacks); err != nil {
		log.Printf("⚠️ Failed to parse feedback file: %v", err)
		return
	}

	log.Printf("📊 Loaded %d existing feedback entries", len(fc.feedbacks))
}

// saveFeedback saves feedback to file
func (fc *FeedbackCollector) saveFeedback() error {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	data, err := json.MarshalIndent(fc.feedbacks, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal feedback: %w", err)
	}

	if err := os.WriteFile(fc.feedbackFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write feedback file: %w", err)
	}

	log.Printf("💾 Saved %d feedback entries to %s", len(fc.feedbacks), fc.feedbackFile)
	return nil
}

// AddFeedback adds new user feedback
func (fc *FeedbackCollector) AddFeedback(feedback UserFeedback) error {
	feedback.ID = fmt.Sprintf("fb-%d", time.Now().UnixNano())
	feedback.Timestamp = time.Now()

	fc.mutex.Lock()
	fc.feedbacks = append(fc.feedbacks, feedback)
	fc.mutex.Unlock()

	log.Printf("✅ Added feedback: %s -> %s (correct: %v, rating: %d/5)",
		feedback.Command[:min(len(feedback.Command), 50)],
		feedback.ActualCategory,
		feedback.IsCorrect,
		feedback.UserRating)

	return fc.saveFeedback()
}

// GetFeedbackStats returns feedback statistics
func (fc *FeedbackCollector) GetFeedbackStats() map[string]interface{} {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	if len(fc.feedbacks) == 0 {
		return map[string]interface{}{
			"total_feedback": 0,
			"accuracy":       0.0,
			"avg_rating":     0.0,
		}
	}

	correctCount := 0
	totalRating := 0.0

	categoryStats := make(map[string]map[string]int)

	for _, fb := range fc.feedbacks {
		if fb.IsCorrect {
			correctCount++
		}
		totalRating += float64(fb.UserRating)

		// Category-wise stats
		if categoryStats[fb.PredictedCategory] == nil {
			categoryStats[fb.PredictedCategory] = map[string]int{
				"total":   0,
				"correct": 0,
			}
		}
		categoryStats[fb.PredictedCategory]["total"]++
		if fb.IsCorrect {
			categoryStats[fb.PredictedCategory]["correct"]++
		}
	}

	accuracy := float64(correctCount) / float64(len(fc.feedbacks)) * 100
	avgRating := totalRating / float64(len(fc.feedbacks))

	return map[string]interface{}{
		"total_feedback":  len(fc.feedbacks),
		"accuracy":        accuracy,
		"avg_rating":      avgRating,
		"category_stats":  categoryStats,
		"correct_count":   correctCount,
		"incorrect_count": len(fc.feedbacks) - correctCount,
	}
}

// GetTrainingData extracts training data from feedback
func (fc *FeedbackCollector) GetTrainingData() []TrainingExample {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	var trainingData []TrainingExample

	for _, fb := range fc.feedbacks {
		// Use actual category from user feedback
		example := TrainingExample{
			Command:    fb.Command,
			Category:   fb.ActualCategory,
			Confidence: calculateConfidenceFromRating(fb.UserRating),
			Source:     "user_feedback",
			Timestamp:  fb.Timestamp,
		}
		trainingData = append(trainingData, example)
	}

	log.Printf("📚 Extracted %d training examples from feedback", len(trainingData))
	return trainingData
}

// GetMisclassifiedExamples returns incorrectly classified examples
func (fc *FeedbackCollector) GetMisclassifiedExamples() []UserFeedback {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	var misclassified []UserFeedback
	for _, fb := range fc.feedbacks {
		if !fb.IsCorrect {
			misclassified = append(misclassified, fb)
		}
	}

	log.Printf("⚠️ Found %d misclassified examples", len(misclassified))
	return misclassified
}

// TrainingExample represents a training data point
type TrainingExample struct {
	Command    string    `json:"command"`
	Category   string    `json:"category"`
	Confidence float64   `json:"confidence"`
	Source     string    `json:"source"`
	Timestamp  time.Time `json:"timestamp"`
}

// calculateConfidenceFromRating converts user rating (1-5) to confidence (0-1)
func calculateConfidenceFromRating(rating int) float64 {
	// 5 stars -> 0.95 confidence
	// 4 stars -> 0.85 confidence
	// 3 stars -> 0.75 confidence
	// 2 stars -> 0.65 confidence
	// 1 star  -> 0.55 confidence
	baseConf := 0.55
	increment := 0.10
	return baseConf + float64(rating-1)*increment
}

// FeedbackManager handles WebSocket feedback messages
type FeedbackManager struct {
	collector *FeedbackCollector
}

// NewFeedbackManager creates a new feedback manager
func NewFeedbackManager(feedbackFile string) *FeedbackManager {
	return &FeedbackManager{
		collector: NewFeedbackCollector(feedbackFile),
	}
}

// HandleFeedbackMessage processes feedback from client
func (fm *FeedbackManager) HandleFeedbackMessage(data map[string]interface{}) error {
	feedback := UserFeedback{
		Command:           getString(data, "command"),
		PredictedCategory: getString(data, "predicted_category"),
		PredictedConf:     getFloat(data, "predicted_confidence"),
		ActualCategory:    getString(data, "actual_category"),
		UserRating:        int(getFloat(data, "user_rating")),
		IsCorrect:         getBool(data, "is_correct"),
		UserComment:       getString(data, "user_comment"),
		SessionID:         getString(data, "session_id"),
		Metadata:          getMap(data, "metadata"),
	}

	return fm.collector.AddFeedback(feedback)
}

// GetStats returns feedback statistics
func (fm *FeedbackManager) GetStats() map[string]interface{} {
	return fm.collector.GetFeedbackStats()
}

// GetTrainingData gets training data for model retraining
func (fm *FeedbackManager) GetTrainingData() []TrainingExample {
	return fm.collector.GetTrainingData()
}

// Helper functions for type conversion
func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key].(string); ok {
		return val
	}
	return ""
}

func getFloat(data map[string]interface{}, key string) float64 {
	if val, ok := data[key].(float64); ok {
		return val
	}
	return 0.0
}

func getBool(data map[string]interface{}, key string) bool {
	if val, ok := data[key].(bool); ok {
		return val
	}
	return false
}

func getMap(data map[string]interface{}, key string) map[string]interface{} {
	if val, ok := data[key].(map[string]interface{}); ok {
		return val
	}
	return make(map[string]interface{})
}

// ExportToWandB exports training data to W&B format
func (fm *FeedbackManager) ExportToWandB(outputFile string) error {
	trainingData := fm.GetTrainingData()

	if len(trainingData) == 0 {
		return fmt.Errorf("no training data available")
	}

	data, err := json.MarshalIndent(trainingData, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal training data: %w", err)
	}

	if err := os.WriteFile(outputFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write training data: %w", err)
	}

	log.Printf("📤 Exported %d training examples to %s", len(trainingData), outputFile)
	return nil
}

// ShouldRetrain determines if model should be retrained
func (fm *FeedbackManager) ShouldRetrain(minFeedback int, minAccuracy float64) bool {
	stats := fm.GetStats()

	totalFeedback := stats["total_feedback"].(int)
	accuracy := stats["accuracy"].(float64)

	shouldRetrain := totalFeedback >= minFeedback && accuracy < minAccuracy

	if shouldRetrain {
		log.Printf("🔄 Retraining recommended: %d feedback (>=%d), accuracy %.1f%% (<%.1f%%)",
			totalFeedback, minFeedback, accuracy, minAccuracy)
	}

	return shouldRetrain
}
