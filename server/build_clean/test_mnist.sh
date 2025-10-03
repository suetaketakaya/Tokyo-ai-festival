#!/bin/bash
# Test MNIST CNN generation in container

echo "Creating mnist_cnn.py in container..."

docker exec 8f0bf28051d0 bash -c 'cat > /workspace/mnist_cnn.py << '\''PYEOF'\''
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import matplotlib
matplotlib.use('\''Agg'\'')
import matplotlib.pyplot as plt
import numpy as np
import os

print("🚀 Starting TensorFlow MNIST CNN Training")
print(f"TensorFlow version: {tf.__version__}")

# Load MNIST dataset
print("📥 Loading MNIST dataset...")
(x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()

# Preprocess - use only 5000 samples for quick test
x_train = x_train[:5000].reshape(-1, 28, 28, 1).astype('\''float32'\'') / 255.0
x_test = x_test[:1000].reshape(-1, 28, 28, 1).astype('\''float32'\'') / 255.0
y_train = keras.utils.to_categorical(y_train[:5000], 10)
y_test = keras.utils.to_categorical(y_test[:1000], 10)

print(f"Training samples: {x_train.shape[0]}")
print(f"Test samples: {x_test.shape[0]}")

# Build CNN model
print("🏗️ Building CNN model...")
model = keras.Sequential([
    layers.Conv2D(32, (3, 3), activation='\''relu'\'', input_shape=(28, 28, 1)),
    layers.MaxPooling2D((2, 2)),
    layers.Conv2D(64, (3, 3), activation='\''relu'\''),
    layers.MaxPooling2D((2, 2)),
    layers.Flatten(),
    layers.Dense(64, activation='\''relu'\''),
    layers.Dropout(0.5),
    layers.Dense(10, activation='\''softmax'\'')
])

model.compile(optimizer='\''adam'\'',
              loss='\''categorical_crossentropy'\'',
              metrics=['\''accuracy'\''])

# Train model (1 epoch for quick test)
print("🚀 Training model...")
history = model.fit(x_train, y_train, epochs=1, validation_split=0.2, verbose=1)

# Evaluate
print("📊 Evaluating model...")
test_loss, test_acc = model.evaluate(x_test, y_test, verbose=0)
print(f"Test accuracy: {test_acc:.4f}")

# Visualize training history
print("📊 Creating training history visualization...")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

ax1.plot(history.history['\''accuracy'\''], label='\''Training Accuracy'\'')
ax1.plot(history.history['\''val_accuracy'\''], label='\''Validation Accuracy'\'')
ax1.set_title('\''Model Accuracy'\'')
ax1.set_xlabel('\''Epoch'\'')
ax1.set_ylabel('\''Accuracy'\'')
ax1.legend()
ax1.grid(True)

ax2.plot(history.history['\''loss'\''], label='\''Training Loss'\'')
ax2.plot(history.history['\''val_loss'\''], label='\''Validation Loss'\'')
ax2.set_title('\''Model Loss'\'')
ax2.set_xlabel('\''Epoch'\'')
ax2.set_ylabel('\''Loss'\'')
ax2.legend()
ax2.grid(True)

plt.tight_layout()
plt.savefig('\''mnist_training_history.png'\'', dpi=100, bbox_inches='\''tight'\'')
print("✅ Saved: mnist_training_history.png")

# Visualize predictions
print("📊 Creating predictions visualization...")
predictions = model.predict(x_test[:10])
predicted_labels = np.argmax(predictions, axis=1)
true_labels = np.argmax(y_test[:10], axis=1)

fig, axes = plt.subplots(2, 5, figsize=(12, 6))
axes = axes.ravel()

for i in range(10):
    axes[i].imshow(x_test[i].reshape(28, 28), cmap='\''gray'\'')
    axes[i].axis('\''off'\'')
    color = '\''green'\'' if predicted_labels[i] == true_labels[i] else '\''red'\''
    axes[i].set_title(f'\''True: {true_labels[i]}\nPred: {predicted_labels[i]}'\'', color=color)

plt.tight_layout()
plt.savefig('\''mnist_predictions.png'\'', dpi=100, bbox_inches='\''tight'\'')
print("✅ Saved: mnist_predictions.png")

print("🎉 Training and visualization complete!")
PYEOF'

echo "Executing Python script in container..."
docker exec 8f0bf28051d0 python3 /workspace/mnist_cnn.py

echo ""
echo "Checking generated images..."
docker exec 8f0bf28051d0 ls -lh /workspace/*.png

echo ""
echo "Copying images to host..."
docker cp 8f0bf28051d0:/workspace/mnist_training_history.png ./html/images/
docker cp 8f0bf28051d0:/workspace/mnist_predictions.png ./html/images/

echo ""
echo "Images in html/images:"
ls -lh ./html/images/
