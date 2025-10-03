package main

import (
	"fmt"
)

// Generate machine learning code based on task type
func generateMLCode(command, cmdType string) string {
	switch cmdType {
	case "machine_learning":
		return generateTensorFlowMNIST(command)
	case "visualization":
		return generateVisualizationCode(command)
	case "data_analysis":
		return generateDataAnalysisCode(command)
	default:
		return generateDefaultPythonCode(command)
	}
}

func generateTensorFlowMNIST(command string) string {
	return fmt.Sprintf(`#!/bin/bash
# TensorFlow MNIST CNN Model based on: %s

echo "Creating mnist_cnn.py..."

cat > mnist_cnn.py << 'PYEOF'
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import os

print("🚀 Starting TensorFlow MNIST CNN Training")
print(f"TensorFlow version: {tf.__version__}")

# Load MNIST dataset
print("📥 Loading MNIST dataset...")
(x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()

# Preprocess data
x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255.0
x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255.0
y_train = keras.utils.to_categorical(y_train, 10)
y_test = keras.utils.to_categorical(y_test, 10)

print(f"Training samples: {x_train.shape[0]}")
print(f"Test samples: {x_test.shape[0]}")

# Build CNN model
print("🏗️  Building CNN model...")
model = keras.Sequential([
    layers.Conv2D(32, (3, 3), activation='relu', input_shape=(28, 28, 1)),
    layers.MaxPooling2D((2, 2)),
    layers.Conv2D(64, (3, 3), activation='relu'),
    layers.MaxPooling2D((2, 2)),
    layers.Conv2D(64, (3, 3), activation='relu'),
    layers.Flatten(),
    layers.Dense(64, activation='relu'),
    layers.Dropout(0.5),
    layers.Dense(10, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print("📊 Model Summary:")
model.summary()

# Train model
print("🎯 Training model...")
history = model.fit(
    x_train, y_train,
    epochs=5,
    batch_size=128,
    validation_split=0.2,
    verbose=1
)

# Evaluate model
print("✅ Evaluating model...")
test_loss, test_acc = model.evaluate(x_test, y_test, verbose=0)
print(f"Test accuracy: {test_acc:.4f}")
print(f"Test loss: {test_loss:.4f}")

# Visualize training history
print("📈 Creating visualization...")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

# Accuracy plot
ax1.plot(history.history['accuracy'], label='Training Accuracy', linewidth=2)
ax1.plot(history.history['val_accuracy'], label='Validation Accuracy', linewidth=2)
ax1.set_title('Model Accuracy', fontsize=14, fontweight='bold')
ax1.set_xlabel('Epoch')
ax1.set_ylabel('Accuracy')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Loss plot
ax2.plot(history.history['loss'], label='Training Loss', linewidth=2)
ax2.plot(history.history['val_loss'], label='Validation Loss', linewidth=2)
ax2.set_title('Model Loss', fontsize=14, fontweight='bold')
ax2.set_xlabel('Epoch')
ax2.set_ylabel('Loss')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('mnist_training_history.png', dpi=150, bbox_inches='tight')
print("✅ Visualization saved: mnist_training_history.png")

# Visualize sample predictions
print("🔍 Creating prediction samples...")
fig, axes = plt.subplots(2, 5, figsize=(12, 6))
sample_indices = np.random.choice(len(x_test), 10, replace=False)

for idx, ax in enumerate(axes.flat):
    img = x_test[sample_indices[idx]].reshape(28, 28)
    true_label = np.argmax(y_test[sample_indices[idx]])
    pred_label = np.argmax(model.predict(x_test[sample_indices[idx]:sample_indices[idx]+1], verbose=0))

    ax.imshow(img, cmap='gray')
    color = 'green' if true_label == pred_label else 'red'
    ax.set_title(f'True: {true_label}, Pred: {pred_label}', color=color, fontsize=10)
    ax.axis('off')

plt.tight_layout()
plt.savefig('mnist_predictions.png', dpi=150, bbox_inches='tight')
print("✅ Predictions saved: mnist_predictions.png")

print("🎉 Training complete!")
print(f"📁 Files created:")
print(f"  - mnist_training_history.png")
print(f"  - mnist_predictions.png")
PYEOF

echo "Created mnist_cnn.py successfully"
echo "File location: $(pwd)/mnist_cnn.py"
ls -la mnist_cnn.py

# Run the training
echo "🚀 Starting training..."
python3 mnist_cnn.py

echo "✅ Training completed!"
ls -la *.png
`, command)
}

func generateVisualizationCode(command string) string {
	return fmt.Sprintf(`#!/bin/bash
# Data Visualization based on: %s

echo "Creating visualization.py..."

cat > visualization.py << 'PYEOF'
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

print("📊 Creating data visualization...")

# Sample data
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)
y3 = np.sin(x) * np.exp(-x/10)

# Create visualization
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))

# Line plot
ax1.plot(x, y1, 'b-', linewidth=2, label='sin(x)')
ax1.plot(x, y2, 'r--', linewidth=2, label='cos(x)')
ax1.set_title('Line Plot', fontsize=14, fontweight='bold')
ax1.set_xlabel('X')
ax1.set_ylabel('Y')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Scatter plot
np.random.seed(42)
x_scatter = np.random.randn(100)
y_scatter = 2 * x_scatter + np.random.randn(100)
ax2.scatter(x_scatter, y_scatter, alpha=0.6, c=y_scatter, cmap='viridis')
ax2.set_title('Scatter Plot', fontsize=14, fontweight='bold')
ax2.set_xlabel('X')
ax2.set_ylabel('Y')

# Bar chart
categories = ['A', 'B', 'C', 'D', 'E']
values = [23, 45, 56, 78, 32]
ax3.bar(categories, values, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'])
ax3.set_title('Bar Chart', fontsize=14, fontweight='bold')
ax3.set_ylabel('Values')

# Histogram
data = np.random.randn(1000)
ax4.hist(data, bins=30, alpha=0.7, color='skyblue', edgecolor='black')
ax4.set_title('Histogram', fontsize=14, fontweight='bold')
ax4.set_xlabel('Value')
ax4.set_ylabel('Frequency')

plt.tight_layout()
plt.savefig('visualization.png', dpi=150, bbox_inches='tight')
print("✅ Visualization saved: visualization.png")
print(f"File location: $(pwd)/visualization.png")
PYEOF

echo "Created visualization.py successfully"
python3 visualization.py
ls -la visualization.png
`, command)
}

func generateDataAnalysisCode(command string) string {
	return fmt.Sprintf(`#!/bin/bash
# Data Analysis based on: %s

echo "Creating data_analysis.py..."

cat > data_analysis.py << 'PYEOF'
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

print("📊 Starting data analysis...")

# Create sample dataset
np.random.seed(42)
data = {
    'Date': pd.date_range('2024-01-01', periods=100),
    'Sales': np.random.randint(1000, 5000, 100),
    'Customers': np.random.randint(50, 200, 100),
    'Revenue': np.random.randint(10000, 50000, 100)
}
df = pd.DataFrame(data)

print("Dataset shape:", df.shape)
print("\nFirst 5 rows:")
print(df.head())

print("\nBasic statistics:")
print(df.describe())

# Visualize data
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(14, 10))

# Sales trend
ax1.plot(df['Date'], df['Sales'], linewidth=2, color='#4ECDC4')
ax1.set_title('Sales Trend', fontsize=14, fontweight='bold')
ax1.set_xlabel('Date')
ax1.set_ylabel('Sales')
ax1.tick_params(axis='x', rotation=45)
ax1.grid(True, alpha=0.3)

# Revenue distribution
ax2.hist(df['Revenue'], bins=20, alpha=0.7, color='#FF6B6B', edgecolor='black')
ax2.set_title('Revenue Distribution', fontsize=14, fontweight='bold')
ax2.set_xlabel('Revenue')
ax2.set_ylabel('Frequency')

# Sales vs Customers scatter
ax3.scatter(df['Customers'], df['Sales'], alpha=0.6, c=df['Revenue'], cmap='viridis')
ax3.set_title('Sales vs Customers', fontsize=14, fontweight='bold')
ax3.set_xlabel('Customers')
ax3.set_ylabel('Sales')

# Correlation heatmap data
corr = df[['Sales', 'Customers', 'Revenue']].corr()
im = ax4.imshow(corr, cmap='coolwarm', aspect='auto', vmin=-1, vmax=1)
ax4.set_xticks(range(len(corr.columns)))
ax4.set_yticks(range(len(corr.columns)))
ax4.set_xticklabels(corr.columns)
ax4.set_yticklabels(corr.columns)
ax4.set_title('Correlation Matrix', fontsize=14, fontweight='bold')

# Add correlation values
for i in range(len(corr)):
    for j in range(len(corr)):
        ax4.text(j, i, f'{corr.iloc[i, j]:.2f}', ha='center', va='center')

plt.tight_layout()
plt.savefig('data_analysis.png', dpi=150, bbox_inches='tight')
print("✅ Analysis visualization saved: data_analysis.png")
PYEOF

echo "Created data_analysis.py successfully"
python3 data_analysis.py
ls -la data_analysis.png
`, command)
}

func generateDefaultPythonCode(command string) string {
	return fmt.Sprintf(`# Generated Python code based on: %s
import sys
import os

def main():
    print("Executing: %s")
    # Generated implementation here
    return "Success"

if __name__ == "__main__":
    result = main()
    print(f"Result: {result}")
`, command, command)
}
