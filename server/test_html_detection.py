#!/usr/bin/env python3

def contains_substring(s, substr):
    """Helper function to check if a string contains a substring"""
    for i in range(len(s) - len(substr) + 1):
        if s[i:i+len(substr)] == substr:
            return True
    return False

def contains(s, substr):
    """Go-style contains function"""
    return (len(s) >= len(substr) and
            (s == substr or
             s[:len(substr)] == substr or
             s[len(s)-len(substr):] == substr or
             contains_substring(s, substr)))

def contains_web_content(output):
    """Enhanced containsWebContent function with HTML detection"""
    # 既存の検出パターン
    if contains(output, "http://") or contains(output, "web") or contains(output, "app"):
        return True

    # HTMLファイル検出パターンを追加
    html_patterns = [
        ".html",
        "index.html",
        "todo-app.html",
        "HTML file",
        "created.*html",
        "HTML",
        "webpage",
    ]

    for pattern in html_patterns:
        if contains(output, pattern):
            return True

    return False

def test_html_detection():
    """Test the HTML detection functionality"""
    test_cases = [
        # Should detect HTML
        ("Created todo-app.html successfully", True),
        ("Generated index.html file", True),
        ("HTML file created", True),
        ("Saved as webpage.html", True),
        ("Output: demo.html", True),
        ("Created HTML document", True),
        ("Generated webpage content", True),
        ("File: project.html created", True),

        # Should NOT detect HTML (original patterns)
        ("http://localhost:3000", True),  # Should still detect web content
        ("Starting web server", True),    # Should still detect web content
        ("React app running", True),      # Should still detect app content

        # Should NOT detect HTML
        ("Created Python script", False),
        ("Generated data.csv", False),
        ("Processing complete", False),
        ("Script execution finished", False),
        ("No HTML content here", False),
    ]

    print("🧪 Testing HTML Detection Logic")
    print("=" * 50)

    passed = 0
    failed = 0

    for test_input, expected in test_cases:
        result = contains_web_content(test_input)
        status = "✅ PASS" if result == expected else "❌ FAIL"

        print(f"{status} | '{test_input}' -> {result} (expected: {expected})")

        if result == expected:
            passed += 1
        else:
            failed += 1

    print("=" * 50)
    print(f"📊 Results: {passed} passed, {failed} failed")

    if failed == 0:
        print("🎉 All tests passed! HTML detection is working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Review the logic.")
        return False

if __name__ == "__main__":
    success = test_html_detection()

    # Test specific todo-app.html case
    print("\n🎯 Testing specific todo-app.html case:")
    test_output = "Created todo-app.html successfully"
    result = contains_web_content(test_output)
    print(f"Input: '{test_output}'")
    print(f"Result: {result}")
    print(f"Status: {'✅ PASS' if result else '❌ FAIL'}")