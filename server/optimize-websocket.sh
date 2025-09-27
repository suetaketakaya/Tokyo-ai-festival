#!/bin/bash
# WebSocket Optimization Script

sudo sysctl -w net.inet.tcp.keepintvl=7200
sudo sysctl -w net.inet.tcp.keepidle=7200
sudo sysctl -w net.inet.tcp.always_keepalive=1
sudo sysctl -w net.inet.tcp.delayed_ack=0
sudo sysctl -w net.inet.tcp.nodelay=1
sudo sysctl -w net.inet.tcp.rfc1323=1
sudo sysctl -w net.inet.tcp.sendspace=65536
sudo sysctl -w net.inet.tcp.recvspace=65536
sudo sysctl -w net.inet.tcp.msl=15000
sudo sysctl -w net.inet.tcp.fin_timeout=15
