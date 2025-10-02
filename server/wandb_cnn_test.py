#!/usr/bin/env python3
"""
W&B CNN Integration Test Script
Creates matplotlib plots designed to test W&B integration and CNN classification
"""

import matplotlib
matplotlib.use('Agg')  # Non-GUI backend

import matplotlib.pyplot as plt
import numpy as np
import time
from datetime import datetime

# Set matplotlib parameters for W&B integration
plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['font.size'] = 12

def create_wandb_training_curve():
    """Create a training loss curve plot for W&B CNN testing"""
    epochs = np.arange(1, 21)
    training_loss = 2.0 * np.exp(-epochs * 0.15) + 0.1 + np.random.normal(0, 0.05, 20)
    validation_loss = 2.2 * np.exp(-epochs * 0.12) + 0.15 + np.random.normal(0, 0.08, 20)

    plt.figure(figsize=(12, 8))
    plt.plot(epochs, training_loss, 'b-', linewidth=2, label='Training Loss', marker='o')
    plt.plot(epochs, validation_loss, 'r--', linewidth=2, label='Validation Loss', marker='s')

    plt.title('CNN Model Training Progress - W&B Demo', fontsize=16, fontweight='bold')
    plt.xlabel('Epoch', fontsize=14)
    plt.ylabel('Loss', fontsize=14)
    plt.legend(fontsize=12)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    # Save with W&B metadata in filename
    timestamp = datetime.now().strftime("%H:%M:%S")
    filename = f'wandb_cnn_training_progress_{timestamp.replace(":", "")}.png'
    plt.savefig(filename, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✅ Created W&B training curve: {filename}")
    return filename

def create_cnn_architecture_diagram():
    """Create a CNN architecture visualization for classification testing"""
    fig, ax = plt.subplots(figsize=(14, 10))

    # Create a visual representation of CNN layers
    layers = ['Input\n(224x224x3)', 'Conv2D\n(32 filters)', 'MaxPool\n(2x2)',
              'Conv2D\n(64 filters)', 'MaxPool\n(2x2)', 'Conv2D\n(128 filters)',
              'GlobalAvgPool', 'Dense\n(512)', 'Dropout\n(0.5)', 'Output\n(10 classes)']

    x_positions = np.linspace(0, 10, len(layers))
    y_positions = [0] * len(layers)

    # Draw layer boxes
    for i, (x, y, layer) in enumerate(zip(x_positions, y_positions, layers)):
        if 'Conv' in layer:
            color = 'lightblue'
        elif 'Pool' in layer:
            color = 'lightgreen'
        elif 'Dense' in layer or 'Output' in layer:
            color = 'lightcoral'
        else:
            color = 'lightyellow'

        rect = plt.Rectangle((x-0.4, y-0.3), 0.8, 0.6,
                           facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(rect)
        ax.text(x, y, layer, ha='center', va='center', fontsize=10, fontweight='bold')

        # Draw arrows between layers
        if i < len(layers) - 1:
            ax.arrow(x+0.4, y, 0.6, 0, head_width=0.1, head_length=0.1,
                    fc='darkblue', ec='darkblue', linewidth=2)

    ax.set_xlim(-1, 11)
    ax.set_ylim(-1, 1)
    ax.set_title('CNN Architecture for Plot Classification\nW&B Integration Demo',
                fontsize=16, fontweight='bold', pad=20)
    ax.axis('off')

    timestamp = datetime.now().strftime("%H:%M:%S")
    filename = f'wandb_cnn_architecture_{timestamp.replace(":", "")}.png'
    plt.savefig(filename, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✅ Created CNN architecture diagram: {filename}")
    return filename

def create_classification_results():
    """Create classification accuracy results for different plot types"""
    plot_types = ['Line Plot', 'Scatter Plot', 'Bar Chart', 'Histogram',
                 'Heatmap', 'Box Plot', 'Training Curve', 'Dashboard']
    accuracies = [0.95, 0.92, 0.88, 0.90, 0.87, 0.85, 0.98, 0.83]

    plt.figure(figsize=(12, 8))
    bars = plt.bar(plot_types, accuracies,
                  color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                        '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'])

    plt.title('CNN Classification Accuracy by Plot Type\nW&B Tuned Model Results',
             fontsize=16, fontweight='bold')
    plt.xlabel('Plot Type', fontsize=14)
    plt.ylabel('Classification Accuracy', fontsize=14)
    plt.ylim(0, 1.0)

    # Add value labels on bars
    for bar, acc in zip(bars, accuracies):
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                f'{acc:.2f}', ha='center', va='bottom', fontweight='bold')

    plt.xticks(rotation=45, ha='right')
    plt.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()

    timestamp = datetime.now().strftime("%H:%M:%S")
    filename = f'wandb_cnn_classification_results_{timestamp.replace(":", "")}.png'
    plt.savefig(filename, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✅ Created classification results: {filename}")
    return filename

def create_wandb_dashboard():
    """Create a comprehensive W&B-style dashboard"""
    fig = plt.figure(figsize=(16, 12))

    # Create subplot grid
    gs = fig.add_gridspec(3, 3, hspace=0.3, wspace=0.3)

    # Training metrics (top row)
    ax1 = fig.add_subplot(gs[0, 0])
    epochs = np.arange(1, 51)
    loss = 3.0 * np.exp(-epochs * 0.08) + 0.05
    ax1.plot(epochs, loss, 'b-', linewidth=2)
    ax1.set_title('Training Loss', fontweight='bold')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Loss')
    ax1.grid(True, alpha=0.3)

    ax2 = fig.add_subplot(gs[0, 1])
    accuracy = 1 - 0.8 * np.exp(-epochs * 0.1)
    ax2.plot(epochs, accuracy, 'g-', linewidth=2)
    ax2.set_title('Validation Accuracy', fontweight='bold')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Accuracy')
    ax2.grid(True, alpha=0.3)

    ax3 = fig.add_subplot(gs[0, 2])
    learning_rates = [0.01, 0.005, 0.001, 0.0005, 0.0001]
    final_accs = [0.85, 0.88, 0.92, 0.90, 0.87]
    ax3.semilogx(learning_rates, final_accs, 'ro-', linewidth=2, markersize=8)
    ax3.set_title('Learning Rate vs Accuracy', fontweight='bold')
    ax3.set_xlabel('Learning Rate')
    ax3.set_ylabel('Final Accuracy')
    ax3.grid(True, alpha=0.3)

    # Confusion matrix (middle left)
    ax4 = fig.add_subplot(gs[1, :2])
    confusion_matrix = np.random.randint(0, 100, (8, 8))
    np.fill_diagonal(confusion_matrix, np.random.randint(150, 200, 8))
    im = ax4.imshow(confusion_matrix, cmap='Blues', aspect='auto')
    ax4.set_title('Confusion Matrix - Plot Type Classification', fontweight='bold')
    ax4.set_xlabel('Predicted Class')
    ax4.set_ylabel('True Class')

    # Feature importance (middle right)
    ax5 = fig.add_subplot(gs[1, 2])
    features = ['Color\nDistribution', 'Edge\nDensity', 'Shape\nComplexity',
               'Text\nDensity', 'Axis\nRatio', 'Point\nCount']
    importance = [0.25, 0.20, 0.18, 0.15, 0.12, 0.10]
    ax5.barh(features, importance, color='skyblue')
    ax5.set_title('Feature Importance', fontweight='bold')
    ax5.set_xlabel('Importance Score')

    # System metrics (bottom row)
    ax6 = fig.add_subplot(gs[2, 0])
    times = np.arange(0, 60, 5)
    gpu_usage = 70 + 15 * np.sin(times * 0.1) + np.random.normal(0, 3, len(times))
    ax6.plot(times, gpu_usage, 'r-', linewidth=2)
    ax6.set_title('GPU Usage', fontweight='bold')
    ax6.set_xlabel('Time (min)')
    ax6.set_ylabel('Usage %')
    ax6.set_ylim(0, 100)
    ax6.grid(True, alpha=0.3)

    ax7 = fig.add_subplot(gs[2, 1])
    memory_usage = 40 + 20 * np.sin(times * 0.15) + np.random.normal(0, 2, len(times))
    ax7.plot(times, memory_usage, 'orange', linewidth=2)
    ax7.set_title('Memory Usage', fontweight='bold')
    ax7.set_xlabel('Time (min)')
    ax7.set_ylabel('Memory (GB)')
    ax7.grid(True, alpha=0.3)

    ax8 = fig.add_subplot(gs[2, 2])
    batch_times = np.random.normal(0.25, 0.05, 100)
    ax8.hist(batch_times, bins=20, color='lightgreen', alpha=0.7, edgecolor='black')
    ax8.set_title('Batch Processing Time', fontweight='bold')
    ax8.set_xlabel('Time (seconds)')
    ax8.set_ylabel('Frequency')

    plt.suptitle('W&B CNN Model Dashboard - Real-time Monitoring',
                fontsize=18, fontweight='bold', y=0.98)

    timestamp = datetime.now().strftime("%H:%M:%S")
    filename = f'wandb_cnn_dashboard_{timestamp.replace(":", "")}.png'
    plt.savefig(filename, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✅ Created W&B dashboard: {filename}")
    return filename

def main():
    """Main function to create all W&B CNN test plots"""
    print("🚀 Starting W&B CNN Integration Test Plot Generation...")
    print("=" * 60)

    created_files = []

    try:
        # Create training curve
        file1 = create_wandb_training_curve()
        created_files.append(file1)
        time.sleep(1)

        # Create CNN architecture
        file2 = create_cnn_architecture_diagram()
        created_files.append(file2)
        time.sleep(1)

        # Create classification results
        file3 = create_classification_results()
        created_files.append(file3)
        time.sleep(1)

        # Create comprehensive dashboard
        file4 = create_wandb_dashboard()
        created_files.append(file4)

        print("=" * 60)
        print("🎉 W&B CNN Test Plot Generation Complete!")
        print(f"📊 Created {len(created_files)} plots for preview testing:")
        for i, file in enumerate(created_files, 1):
            print(f"   {i}. {file}")
        print("\n🔍 These plots are now ready for W&B CNN classification testing")
        print("📱 Check the RemoteClaudeOPS app preview tab to see the results!")

    except Exception as e:
        print(f"❌ Error creating plots: {e}")
        return False

    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ Test plot creation successful - ready for W&B CNN preview testing")
    else:
        print("\n❌ Test plot creation failed")