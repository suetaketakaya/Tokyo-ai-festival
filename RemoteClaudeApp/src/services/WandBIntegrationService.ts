import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WandBConfig {
  apiKey: string;
  entity?: string;
  project?: string;
  isConfigured: boolean;
}

export interface WandBRun {
  id: string;
  name: string;
  project: string;
  state: 'running' | 'finished' | 'crashed' | 'killed';
  url: string;
  config: Record<string, any>;
  summary: Record<string, any>;
  createdAt: Date;
}

class WandBIntegrationService {
  private static instance: WandBIntegrationService;
  private config: WandBConfig | null = null;
  private activeRuns: WandBRun[] = [];

  private constructor() {}

  static getInstance(): WandBIntegrationService {
    if (!WandBIntegrationService.instance) {
      WandBIntegrationService.instance = new WandBIntegrationService();
    }
    return WandBIntegrationService.instance;
  }

  // Initialize W&B configuration
  async initialize(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('wandb_config');
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
      }
    } catch (error) {
      console.warn('Failed to load W&B config:', error);
    }
  }

  // Configure W&B with API key
  async configure(apiKey: string, entity?: string, project?: string): Promise<boolean> {
    try {
      const config: WandBConfig = {
        apiKey,
        entity,
        project,
        isConfigured: true,
      };

      // Save configuration
      await AsyncStorage.setItem('wandb_config', JSON.stringify(config));
      this.config = config;

      // Test the configuration by making a simple API call
      const isValid = await this.validateApiKey(apiKey);
      if (!isValid) {
        throw new Error('Invalid API key');
      }

      return true;
    } catch (error) {
      console.error('W&B configuration failed:', error);
      return false;
    }
  }

  // Validate API key by making a test request
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.wandb.ai/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: `
            query {
              viewer {
                id
                username
              }
            }
          `,
        }),
      });

      const data = await response.json();
      return !data.errors && data.data?.viewer;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  // Get current configuration
  getConfig(): WandBConfig | null {
    return this.config;
  }

  // Check if W&B is configured
  isConfigured(): boolean {
    return this.config?.isConfigured || false;
  }

  // Generate W&B setup command for server execution
  generateSetupCommand(): string {
    if (!this.config?.apiKey) {
      throw new Error('W&B not configured');
    }

    return `
# Install and configure Weights & Biases
pip install wandb
echo "${this.config.apiKey}" | wandb login

# Test installation
python -c "import wandb; print('W&B installed successfully')"
`;
  }

  // Generate sample tracking code
  generateSampleCode(projectName: string = 'my-ai-project'): string {
    const entity = this.config?.entity || 'your-entity';

    return `
import wandb
import random
import numpy as np

# Initialize a new wandb run
run = wandb.init(
    project="${projectName}",
    entity="${entity}",
    config={
        "learning_rate": 0.02,
        "architecture": "CNN",
        "dataset": "CIFAR-100",
        "epochs": 10,
    }
)

# Simulate training loop
for epoch in range(10):
    # Simulate metrics
    accuracy = 0.1 + (epoch * 0.8 / 10) + random.uniform(-0.05, 0.05)
    loss = 2.0 - (epoch * 1.5 / 10) + random.uniform(-0.1, 0.1)

    # Log metrics
    wandb.log({
        "epoch": epoch,
        "accuracy": accuracy,
        "loss": loss,
        "learning_rate": 0.02 * (0.95 ** epoch)
    })

    print(f"Epoch {epoch}: accuracy={accuracy:.3f}, loss={loss:.3f}")

# Log final results
wandb.summary["best_accuracy"] = max([0.1 + (i * 0.8 / 10) for i in range(10)])
wandb.summary["final_loss"] = 0.5

# Save artifacts
with open("model_summary.txt", "w") as f:
    f.write("Model training completed successfully")
wandb.save("model_summary.txt")

print(f"🎯 Training completed! View results at: {wandb.run.url}")
wandb.finish()
`;
  }

  // Generate matplotlib integration code
  generateMatplotlibIntegration(): string {
    return `
import wandb
import matplotlib.pyplot as plt
import numpy as np

# Initialize wandb
wandb.init(project="visualization-example")

# Create sample plots
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

# Plot 1: Training curves
epochs = range(1, 11)
train_loss = [2.0 - (i * 1.5 / 10) + np.random.uniform(-0.1, 0.1) for i in epochs]
val_loss = [2.2 - (i * 1.3 / 10) + np.random.uniform(-0.1, 0.1) for i in epochs]

axes[0, 0].plot(epochs, train_loss, label='Train Loss')
axes[0, 0].plot(epochs, val_loss, label='Validation Loss')
axes[0, 0].set_title('Training Curves')
axes[0, 0].legend()
axes[0, 0].grid(True)

# Plot 2: Accuracy over time
train_acc = [0.1 + (i * 0.8 / 10) + np.random.uniform(-0.05, 0.05) for i in epochs]
val_acc = [0.08 + (i * 0.75 / 10) + np.random.uniform(-0.05, 0.05) for i in epochs]

axes[0, 1].plot(epochs, train_acc, label='Train Accuracy')
axes[0, 1].plot(epochs, val_acc, label='Validation Accuracy')
axes[0, 1].set_title('Accuracy Progress')
axes[0, 1].legend()
axes[0, 1].grid(True)

# Plot 3: Distribution of predictions
predictions = np.random.normal(0.7, 0.2, 1000)
axes[1, 0].hist(predictions, bins=30, alpha=0.7)
axes[1, 0].set_title('Prediction Distribution')
axes[1, 0].set_xlabel('Confidence Score')

# Plot 4: Confusion matrix simulation
from sklearn.metrics import confusion_matrix
import seaborn as sns

y_true = np.random.randint(0, 3, 100)
y_pred = np.random.randint(0, 3, 100)
cm = confusion_matrix(y_true, y_pred)

sns.heatmap(cm, annot=True, fmt='d', ax=axes[1, 1])
axes[1, 1].set_title('Confusion Matrix')

plt.tight_layout()

# Log to wandb
wandb.log({"training_plots": wandb.Image(plt)})

# Save locally and show
plt.savefig('/tmp/wandb_plots.png', dpi=150, bbox_inches='tight')
plt.show()

print("📊 Plots logged to W&B and saved locally!")
wandb.finish()
`;
  }

  // Generate model tuning code with W&B sweeps
  generateSweepCode(): string {
    return `
import wandb
import random

# Define sweep configuration
sweep_config = {
    'method': 'bayes',
    'metric': {
        'name': 'val_accuracy',
        'goal': 'maximize'
    },
    'parameters': {
        'learning_rate': {
            'min': 0.0001,
            'max': 0.1
        },
        'batch_size': {
            'values': [16, 32, 64, 128]
        },
        'optimizer': {
            'values': ['adam', 'sgd', 'rmsprop']
        },
        'dropout': {
            'min': 0.1,
            'max': 0.5
        }
    }
}

# Initialize sweep
sweep_id = wandb.sweep(sweep_config, project="hyperparameter-tuning")

def train_model():
    # Initialize wandb run
    with wandb.init() as run:
        config = wandb.config

        print(f"🔧 Training with config: {dict(config)}")

        # Simulate training with hyperparameters
        best_val_acc = 0
        for epoch in range(20):
            # Simulate training
            lr_factor = min(config.learning_rate * 10, 1.0)
            batch_factor = 1.0 - (config.batch_size - 16) / 112 * 0.1
            dropout_factor = 1.0 - config.dropout * 0.2

            val_accuracy = (0.5 + lr_factor * 0.3 + batch_factor * 0.1 + dropout_factor * 0.1
                          + epoch * 0.02 + random.uniform(-0.05, 0.05))
            val_accuracy = min(val_accuracy, 0.98)

            train_loss = 2.0 - val_accuracy * 1.8 + random.uniform(-0.1, 0.1)

            wandb.log({
                "epoch": epoch,
                "train_loss": train_loss,
                "val_accuracy": val_accuracy,
                "learning_rate": config.learning_rate
            })

            best_val_acc = max(best_val_acc, val_accuracy)

        # Log final metrics
        wandb.log({"best_val_accuracy": best_val_acc})
        print(f"✅ Best validation accuracy: {best_val_acc:.4f}")

# Run sweep agent
print(f"🚀 Starting hyperparameter sweep: {sweep_id}")
print("Run this command to start sweep agent:")
print(f"wandb agent {sweep_id}")

# For demo, run a single training
train_model()
`;
  }

  // Get active runs (mock implementation)
  async getActiveRuns(): Promise<WandBRun[]> {
    // In a real implementation, this would fetch from W&B API
    return this.activeRuns;
  }

  // Create a new run
  async createRun(projectName: string, config: Record<string, any>): Promise<string> {
    const runId = `run_${Date.now()}`;
    const run: WandBRun = {
      id: runId,
      name: `${projectName}_${Date.now()}`,
      project: projectName,
      state: 'running',
      url: `https://wandb.ai/${this.config?.entity}/${projectName}/runs/${runId}`,
      config,
      summary: {},
      createdAt: new Date(),
    };

    this.activeRuns.push(run);
    return runId;
  }

  // Generate complete AI project template
  generateAIProjectTemplate(projectName: string): string {
    return `
# ${projectName} - AI Development with W&B Integration

## Setup
${this.generateSetupCommand()}

## 1. Basic Training Loop
${this.generateSampleCode(projectName)}

## 2. Visualization & Plotting
${this.generateMatplotlibIntegration()}

## 3. Hyperparameter Tuning
${this.generateSweepCode()}

## 4. Advanced Features

### Model Artifacts
\`\`\`python
import wandb

# Save model
wandb.save("model.h5")
wandb.save("model_weights.pkl")

# Log model as artifact
artifact = wandb.Artifact("model", type="model")
artifact.add_file("model.h5")
wandb.log_artifact(artifact)
\`\`\`

### Custom Metrics Dashboard
\`\`\`python
# Log custom charts
wandb.log({
    "custom_chart": wandb.plot.line_series(
        xs=[1, 2, 3, 4],
        ys=[[1, 4, 9, 16], [1, 2, 3, 4]],
        keys=["metric1", "metric2"],
        title="Custom Metrics",
        xname="epoch"
    )
})
\`\`\`

### Integration with Popular ML Libraries
\`\`\`python
# Scikit-learn integration
from sklearn.ensemble import RandomForestClassifier
import wandb
from wandb.sklearn import plot_confusion_matrix, plot_feature_importances

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Log plots
plot_confusion_matrix(y_true, y_pred, labels=["Class A", "Class B"])
plot_feature_importances(model, feature_names)
\`\`\`

## Usage Instructions
1. Run the setup commands to install and configure W&B
2. Execute any of the code blocks above
3. Visit your W&B dashboard to view results
4. Use the sweep configuration for hyperparameter optimization

🚀 Happy AI Development!
`;
  }

  // Clear configuration
  async clearConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem('wandb_config');
      this.config = null;
      this.activeRuns = [];
    } catch (error) {
      console.error('Failed to clear W&B config:', error);
    }
  }
}

export default WandBIntegrationService.getInstance();