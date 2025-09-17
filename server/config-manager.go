package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// ConfigManager handles user and container configuration management
type ConfigManager struct {
	configDir string
}

// UserConfiguration represents global user settings
type UserConfiguration struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Git Configuration
	Git GitConfig `json:"git"`

	// Cloud Services
	Services ServiceConfig `json:"services"`

	// Development Preferences
	Preferences DeveloperPreferences `json:"preferences"`

	// Quick Commands
	QuickCommands []QuickCommand `json:"quick_commands"`
}

// GitConfig contains Git-related settings
type GitConfig struct {
	Username    string `json:"username"`
	Email       string `json:"email"`
	DefaultRepo string `json:"default_repo,omitempty"`
	AuthToken   string `json:"auth_token,omitempty"` // Encrypted
	SSHKey      string `json:"ssh_key,omitempty"`    // Path to SSH key
}

// ServiceConfig contains cloud service configurations
type ServiceConfig struct {
	Firebase FirebaseConfig `json:"firebase,omitempty"`
	AWS      AWSConfig      `json:"aws,omitempty"`
	Vercel   VercelConfig   `json:"vercel,omitempty"`
	Netlify  NetlifyConfig  `json:"netlify,omitempty"`
}

// FirebaseConfig for Firebase integration
type FirebaseConfig struct {
	ProjectID   string `json:"project_id"`
	WebAPIKey   string `json:"web_api_key,omitempty"`
	ServiceKey  string `json:"service_key,omitempty"` // Path to service account key
	HostingSite string `json:"hosting_site,omitempty"`
}

// AWSConfig for AWS integration
type AWSConfig struct {
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key,omitempty"` // Encrypted
	Region          string `json:"region"`
	S3Bucket        string `json:"s3_bucket,omitempty"`
}

// VercelConfig for Vercel deployment
type VercelConfig struct {
	Token     string `json:"token,omitempty"` // Encrypted
	OrgID     string `json:"org_id,omitempty"`
	ProjectID string `json:"project_id,omitempty"`
}

// NetlifyConfig for Netlify deployment
type NetlifyConfig struct {
	Token  string `json:"token,omitempty"` // Encrypted
	SiteID string `json:"site_id,omitempty"`
}

// DeveloperPreferences contains development environment preferences
type DeveloperPreferences struct {
	DefaultLanguage string            `json:"default_language"`
	EditorSettings  map[string]string `json:"editor_settings"`
	TerminalTheme   string            `json:"terminal_theme"`
	AutoCommit      bool              `json:"auto_commit"`
	AutoPush        bool              `json:"auto_push"`
}

// QuickCommand represents a custom quick command
type QuickCommand struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Command     string `json:"command"`
	Category    string `json:"category"`
	RequiresConfirmation bool `json:"requires_confirmation"`
}

// ContainerConfiguration represents project-specific settings
type ContainerConfiguration struct {
	ProjectID   string    `json:"project_id"`
	ContainerID string    `json:"container_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Project-specific overrides
	Git         GitConfig                `json:"git,omitempty"`
	Environment map[string]string        `json:"environment"`
	Services    ServiceConfig            `json:"services,omitempty"`
	Commands    []QuickCommand           `json:"commands,omitempty"`

	// Container runtime settings
	Runtime RuntimeConfig `json:"runtime"`
}

// RuntimeConfig contains container runtime settings
type RuntimeConfig struct {
	WorkingDirectory string            `json:"working_directory"`
	PathExtensions   []string          `json:"path_extensions"`
	Aliases          map[string]string `json:"aliases"`
	StartupCommands  []string          `json:"startup_commands"`
}

// ConfigSyncRequest represents a configuration sync request from mobile
type ConfigSyncRequest struct {
	UserID          string                  `json:"user_id"`
	UserConfig      *UserConfiguration      `json:"user_config,omitempty"`
	ContainerConfig *ContainerConfiguration `json:"container_config,omitempty"`
	TargetContainer string                  `json:"target_container,omitempty"`
	SyncType        string                  `json:"sync_type"` // "check", "update", "force"
}

// ConfigSyncResponse represents the server's response to a sync request
type ConfigSyncResponse struct {
	Status       string                   `json:"status"`
	Message      string                   `json:"message"`
	Conflicts    []ConfigConflict         `json:"conflicts,omitempty"`
	Applied      []string                 `json:"applied,omitempty"`
	UserConfig   *UserConfiguration       `json:"user_config,omitempty"`
	ContainerConfig *ContainerConfiguration `json:"container_config,omitempty"`
}

// ConfigConflict represents a configuration conflict that needs user resolution
type ConfigConflict struct {
	Field        string      `json:"field"`
	ServerValue  interface{} `json:"server_value"`
	ClientValue  interface{} `json:"client_value"`
	Severity     string      `json:"severity"` // "warning", "error"
	AutoResolve  bool        `json:"auto_resolve"`
}

// NewConfigManager creates a new configuration manager
func NewConfigManager() *ConfigManager {
	configDir := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "config")
	os.MkdirAll(configDir, 0755)

	return &ConfigManager{
		configDir: configDir,
	}
}

// SaveUserConfig saves user configuration to disk
func (cm *ConfigManager) SaveUserConfig(config *UserConfiguration) error {
	config.UpdatedAt = time.Now()
	if config.CreatedAt.IsZero() {
		config.CreatedAt = time.Now()
	}

	configPath := filepath.Join(cm.configDir, fmt.Sprintf("user_%s.json", config.UserID))
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %v", err)
	}

	return ioutil.WriteFile(configPath, data, 0600) // Secure permissions
}

// LoadUserConfig loads user configuration from disk
func (cm *ConfigManager) LoadUserConfig(userID string) (*UserConfiguration, error) {
	configPath := filepath.Join(cm.configDir, fmt.Sprintf("user_%s.json", userID))

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// Return default configuration
		return cm.getDefaultUserConfig(userID), nil
	}

	data, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %v", err)
	}

	var config UserConfiguration
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %v", err)
	}

	return &config, nil
}

// SaveContainerConfig saves container-specific configuration
func (cm *ConfigManager) SaveContainerConfig(config *ContainerConfiguration) error {
	config.UpdatedAt = time.Now()
	if config.CreatedAt.IsZero() {
		config.CreatedAt = time.Now()
	}

	configPath := filepath.Join(cm.configDir, fmt.Sprintf("container_%s.json", config.ProjectID))
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal container config: %v", err)
	}

	return ioutil.WriteFile(configPath, data, 0600)
}

// LoadContainerConfig loads container-specific configuration
func (cm *ConfigManager) LoadContainerConfig(projectID string) (*ContainerConfiguration, error) {
	configPath := filepath.Join(cm.configDir, fmt.Sprintf("container_%s.json", projectID))

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// Return default configuration
		return cm.getDefaultContainerConfig(projectID), nil
	}

	data, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read container config: %v", err)
	}

	var config ContainerConfiguration
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal container config: %v", err)
	}

	return &config, nil
}

// SyncConfigToContainer applies configuration to a running container
func (cm *ConfigManager) SyncConfigToContainer(containerID string, syncRequest *ConfigSyncRequest) (*ConfigSyncResponse, error) {
	log.Printf("🔄 Syncing configuration to container %s", containerID[:12])

	response := &ConfigSyncResponse{
		Status:  "success",
		Applied: []string{},
	}

	// Load existing configuration
	var userConfig *UserConfiguration
	var containerConfig *ContainerConfiguration
	var err error

	if syncRequest.UserConfig != nil {
		userConfig = syncRequest.UserConfig
	} else if syncRequest.UserID != "" {
		userConfig, err = cm.LoadUserConfig(syncRequest.UserID)
		if err != nil {
			return nil, fmt.Errorf("failed to load user config: %v", err)
		}
	}

	if syncRequest.ContainerConfig != nil {
		containerConfig = syncRequest.ContainerConfig
	} else if syncRequest.TargetContainer != "" {
		// Extract project ID from container name
		projectID := strings.TrimPrefix(syncRequest.TargetContainer, "remoteclaude-")
		containerConfig, err = cm.LoadContainerConfig(projectID)
		if err != nil {
			return nil, fmt.Errorf("failed to load container config: %v", err)
		}
	}

	// Apply Git configuration
	if userConfig != nil && userConfig.Git.Username != "" {
		if err := cm.applyGitConfig(containerID, &userConfig.Git); err != nil {
			log.Printf("⚠️ Failed to apply git config: %v", err)
		} else {
			response.Applied = append(response.Applied, "git_config")
		}
	}

	// Apply environment variables
	if containerConfig != nil && len(containerConfig.Environment) > 0 {
		if err := cm.applyEnvironmentVariables(containerID, containerConfig.Environment); err != nil {
			log.Printf("⚠️ Failed to apply environment variables: %v", err)
		} else {
			response.Applied = append(response.Applied, "environment_variables")
		}
	}

	// Apply aliases and startup commands
	if containerConfig != nil {
		if err := cm.applyRuntimeConfig(containerID, &containerConfig.Runtime); err != nil {
			log.Printf("⚠️ Failed to apply runtime config: %v", err)
		} else {
			response.Applied = append(response.Applied, "runtime_config")
		}
	}

	response.Message = fmt.Sprintf("Applied %d configuration items to container", len(response.Applied))
	return response, nil
}

// applyGitConfig applies Git configuration to container
func (cm *ConfigManager) applyGitConfig(containerID string, gitConfig *GitConfig) error {
	// First ensure the home directory and .gitconfig are properly owned
	setupCommands := []string{
		"mkdir -p /home/claude",
		"chown claude:claude /home/claude",
		"touch /home/claude/.gitconfig",
		"chown claude:claude /home/claude/.gitconfig",
		"chmod 644 /home/claude/.gitconfig",
	}

	// Run setup commands as root
	for _, cmd := range setupCommands {
		execCmd := fmt.Sprintf("docker exec %s /bin/bash -c '%s'", containerID, cmd)
		if err := runCommand(execCmd); err != nil {
			log.Printf("⚠️ Setup command failed (continuing): %v", err)
		}
	}

	// Run git config commands as the claude user
	gitCommands := []string{
		fmt.Sprintf(`git config --global user.name "%s"`, gitConfig.Username),
		fmt.Sprintf(`git config --global user.email "%s"`, gitConfig.Email),
	}

	for _, cmd := range gitCommands {
		execCmd := fmt.Sprintf("docker exec -u claude %s /bin/bash -c '%s'", containerID, cmd)
		if err := runCommand(execCmd); err != nil {
			// Try alternative approach with explicit config file
			altCmd := fmt.Sprintf("docker exec -u claude %s /bin/bash -c 'export HOME=/home/claude && %s'", containerID, cmd)
			if err2 := runCommand(altCmd); err2 != nil {
				log.Printf("⚠️ Git config file approach failed, setting environment variables as fallback")
				// Set Git config via environment variables as final fallback
				envCommands := []string{
					fmt.Sprintf(`echo 'export GIT_AUTHOR_NAME="%s"' >> ~/.bashrc`, gitConfig.Username),
					fmt.Sprintf(`echo 'export GIT_COMMITTER_NAME="%s"' >> ~/.bashrc`, gitConfig.Username),
					fmt.Sprintf(`echo 'export GIT_AUTHOR_EMAIL="%s"' >> ~/.bashrc`, gitConfig.Email),
					fmt.Sprintf(`echo 'export GIT_COMMITTER_EMAIL="%s"' >> ~/.bashrc`, gitConfig.Email),
				}
				combinedCmd := strings.Join(envCommands, " && ")
				envCmd := fmt.Sprintf("docker exec -u claude %s /bin/bash -c '%s'", containerID, combinedCmd)
				if err3 := runCommand(envCmd); err3 != nil {
					return fmt.Errorf("failed to execute git config via all methods: config: %v, alt: %v, env: %v", err, err2, err3)
				}
				log.Printf("✅ Applied Git configuration via environment variables as fallback")
			}
		}
	}

	log.Printf("✅ Applied Git configuration to container %s", containerID[:12])
	return nil
}

// applyEnvironmentVariables applies environment variables to container
func (cm *ConfigManager) applyEnvironmentVariables(containerID string, envVars map[string]string) error {
	var envCommands []string

	for key, value := range envVars {
		envCommands = append(envCommands, fmt.Sprintf(`echo 'export %s="%s"' >> ~/.bashrc`, key, value))
	}

	if len(envCommands) > 0 {
		combinedCmd := strings.Join(envCommands, " && ")
		execCmd := fmt.Sprintf("docker exec %s /bin/bash -c '%s'", containerID, combinedCmd)
		if err := runCommand(execCmd); err != nil {
			return fmt.Errorf("failed to apply environment variables: %v", err)
		}
	}

	log.Printf("✅ Applied %d environment variables to container %s", len(envVars), containerID[:12])
	return nil
}

// applyRuntimeConfig applies runtime configuration to container
func (cm *ConfigManager) applyRuntimeConfig(containerID string, runtime *RuntimeConfig) error {
	var commands []string

	// Apply aliases
	for alias, command := range runtime.Aliases {
		commands = append(commands, fmt.Sprintf(`echo 'alias %s="%s"' >> ~/.bashrc`, alias, command))
	}

	// Apply startup commands
	if len(runtime.StartupCommands) > 0 {
		startupScript := strings.Join(runtime.StartupCommands, "\n")
		commands = append(commands, fmt.Sprintf(`echo '%s' >> ~/.bashrc`, startupScript))
	}

	if len(commands) > 0 {
		combinedCmd := strings.Join(commands, " && ")
		execCmd := fmt.Sprintf("docker exec %s /bin/bash -c '%s'", containerID, combinedCmd)
		if err := runCommand(execCmd); err != nil {
			return fmt.Errorf("failed to apply runtime config: %v", err)
		}
	}

	log.Printf("✅ Applied runtime configuration to container %s", containerID[:12])
	return nil
}

// getDefaultUserConfig returns default user configuration
func (cm *ConfigManager) getDefaultUserConfig(userID string) *UserConfiguration {
	return &UserConfiguration{
		ID:        generateConfigID(),
		UserID:    userID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Git: GitConfig{
			Username: "",
			Email:    "",
		},
		Preferences: DeveloperPreferences{
			DefaultLanguage: "en",
			EditorSettings:  make(map[string]string),
			TerminalTheme:   "default",
			AutoCommit:      false,
			AutoPush:        false,
		},
		QuickCommands: GetDefaultQuickCommands(),
	}
}

// getDefaultContainerConfig returns default container configuration
func (cm *ConfigManager) getDefaultContainerConfig(projectID string) *ContainerConfiguration {
	return &ContainerConfiguration{
		ProjectID:   projectID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Environment: make(map[string]string),
		Runtime: RuntimeConfig{
			WorkingDirectory: "/workspace",
			PathExtensions:   []string{},
			Aliases:          make(map[string]string),
			StartupCommands:  []string{},
		},
	}
}

// GetDefaultQuickCommands returns default quick commands
func GetDefaultQuickCommands() []QuickCommand {
	return []QuickCommand{
		{
			ID:          "git_status",
			Name:        "Git Status",
			Description: "Check git repository status",
			Command:     "git status",
			Category:    "git",
		},
		{
			ID:          "git_add_all",
			Name:        "Git Add All",
			Description: "Add all changes to staging",
			Command:     "git add .",
			Category:    "git",
		},
		{
			ID:          "git_commit",
			Name:        "Git Commit",
			Description: "Commit staged changes",
			Command:     `git commit -m "Update: $(date)"`,
			Category:    "git",
			RequiresConfirmation: true,
		},
		{
			ID:          "git_push",
			Name:        "Git Push",
			Description: "Push to remote repository",
			Command:     "git push origin main",
			Category:    "git",
			RequiresConfirmation: true,
		},
		{
			ID:          "firebase_deploy",
			Name:        "Firebase Deploy",
			Description: "Deploy to Firebase Hosting",
			Command:     "firebase deploy",
			Category:    "deployment",
			RequiresConfirmation: true,
		},
		{
			ID:          "npm_install",
			Name:        "NPM Install",
			Description: "Install npm dependencies",
			Command:     "npm install",
			Category:    "package_management",
		},
		{
			ID:          "python_requirements",
			Name:        "Install Python Requirements",
			Description: "Install Python dependencies",
			Command:     "pip install -r requirements.txt",
			Category:    "package_management",
		},
	}
}

// Helper functions

func generateConfigID() string {
	return fmt.Sprintf("config_%d", time.Now().UnixNano())
}

func runCommand(command string) error {
	// Execute shell command
	cmd := exec.Command("bash", "-c", command)
	output, err := cmd.CombinedOutput()

	if err != nil {
		log.Printf("❌ Command failed: %s, Output: %s", command, string(output))
		return err
	}

	log.Printf("✅ Command executed: %s", command)
	return nil
}