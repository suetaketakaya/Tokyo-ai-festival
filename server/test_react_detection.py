#!/usr/bin/env python3

def contains(s, substr):
    """Go-style contains function"""
    return substr in s

def detect_framework(command):
    """Test the detectFramework function logic"""
    if contains(command, "flask"):
        return "flask"
    if contains(command, "streamlit"):
        return "streamlit"
    if contains(command, "jupyter"):
        return "jupyter"
    if contains(command, "React") or contains(command, "react") or contains(command, "Todo") or contains(command, "todo"):
        return "react"
    return "standard"

def determine_command_type(command):
    """Test the determineCommandType function logic"""
    if contains(command, "plot") or contains(command, "matplotlib"):
        return "visualization"
    if contains(command, "web") or contains(command, "app"):
        return "web_app"
    if contains(command, "data") or contains(command, "analysis"):
        return "data_analysis"
    return "general"

def should_generate_html(command):
    """Test if command should generate HTML"""
    framework = detect_framework(command)
    cmd_type = determine_command_type(command)
    
    return (cmd_type == "web_app" or 
            framework == "react" or 
            contains(command, "html") or 
            contains(command, "todo"))

def test_react_todo_detection():
    """Test the React Todo detection functionality"""
    test_cases = [
        # Should generate HTML
        ("React.jsを使用してシングルページアプリケーションを作成してください。Todo管理機能付きで、タスクの追加・削除・完了マークができるようにしてください。", True),
        ("Create a React app", True),
        ("Build a todo application", True),
        ("Make a simple todo app", True),
        ("HTML page creation", True),
        ("Create web application", True),
        
        # Should NOT generate HTML
        ("Create a Python script", False),
        ("Data analysis with pandas", False),
        ("Generate matplotlib plot", False),
    ]

    print("🧪 Testing React/Todo Detection Logic")
    print("=" * 60)

    passed = 0
    failed = 0

    for test_input, expected in test_cases:
        framework = detect_framework(test_input)
        cmd_type = determine_command_type(test_input)
        result = should_generate_html(test_input)
        
        status = "✅ PASS" if result == expected else "❌ FAIL"
        
        print(f"{status} | Framework: {framework:8} | Type: {cmd_type:12} | HTML: {result}")
        print(f"      | Input: '{test_input[:50]}{'...' if len(test_input) > 50 else ''}'")
        print()

        if result == expected:
            passed += 1
        else:
            failed += 1

    print("=" * 60)
    print(f"📊 Results: {passed} passed, {failed} failed")

    if failed == 0:
        print("🎉 All tests passed! React/Todo detection is working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Review the logic.")
        return False

if __name__ == "__main__":
    success = test_react_todo_detection()
    
    # Test specific React Todo case
    print("\n🎯 Testing specific React Todo case:")
    test_command = "React.jsを使用してシングルページアプリケーションを作成してください。Todo管理機能付きで、タスクの追加・削除・完了マークができるようにしてください。"
    framework = detect_framework(test_command)
    cmd_type = determine_command_type(test_command)
    should_html = should_generate_html(test_command)
    
    print(f"Command: '{test_command[:60]}...'")
    print(f"Framework: {framework}")
    print(f"Type: {cmd_type}")
    print(f"Should generate HTML: {should_html}")
    print(f"Status: {'✅ CORRECT' if should_html else '❌ INCORRECT'}")
