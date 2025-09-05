# RemoteClaude Secure Development Container
# Ubuntu 22.04 LTS + Claude CLI + Development Tools
FROM ubuntu:22.04

# Avoid timezone prompt
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo

# Set up non-root user for security
RUN groupadd -r claude && useradd -r -g claude -u 1000 claude

# Install essential development tools
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    build-essential \
    python3 \
    python3-pip \
    nodejs \
    npm \
    golang-go \
    rustc \
    openjdk-11-jdk \
    docker.io \
    htop \
    tree \
    jq \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    ssh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI (when available)
# For now, we'll create a placeholder script
RUN mkdir -p /usr/local/bin
COPY claude-cli-wrapper.sh /usr/local/bin/claude
RUN chmod +x /usr/local/bin/claude

# Set up workspace directory with proper permissions
RUN mkdir -p /workspace && chown -R claude:claude /workspace

# Install additional development tools
RUN npm install -g typescript \
    @types/node \
    nodemon \
    create-react-app \
    @vue/cli \
    @angular/cli

# Install Python development packages
RUN python3 -m pip install --upgrade pip \
    && pip3 install \
    fastapi \
    uvicorn \
    requests \
    pandas \
    numpy \
    jupyter \
    black \
    flake8 \
    pytest

# Configure Git (will be overridden by project settings)
RUN git config --global user.name "RemoteClaude User" \
    && git config --global user.email "user@remoteclaude.dev" \
    && git config --global init.defaultBranch main

# Set up SSH for secure access
RUN mkdir -p /home/claude/.ssh && chown -R claude:claude /home/claude/.ssh

# Add claude user to necessary groups
RUN usermod -aG sudo claude \
    && usermod -aG docker claude

# Allow claude user to run sudo without password for development tools
RUN echo 'claude ALL=(ALL) NOPASSWD: /usr/bin/apt, /usr/bin/apt-get, /usr/local/bin/*, /bin/mkdir, /bin/chmod, /bin/chown' >> /etc/sudoers

# Set up project isolation script
COPY project-init.sh /usr/local/bin/project-init
RUN chmod +x /usr/local/bin/project-init

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ps aux | grep -q '[c]laude' || exit 1

# Set up shell environment before switching user
RUN echo 'export PS1="🤖 RemoteClaude [\u@\h \W]$ "' >> /home/claude/.bashrc \
    && echo 'alias ll="ls -la"' >> /home/claude/.bashrc \
    && echo 'alias la="ls -la"' >> /home/claude/.bashrc \
    && echo 'export PATH=$PATH:/usr/local/bin' >> /home/claude/.bashrc \
    && chown claude:claude /home/claude/.bashrc

# Switch to non-root user
USER claude
WORKDIR /workspace

# Default command
CMD ["/bin/bash", "-l"]