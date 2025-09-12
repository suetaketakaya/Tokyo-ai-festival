package main

import (
	"fmt"
	"strings"
)

func TestAdvancedPermissionPatterns() {
	pm := NewPermissionManager()
	
	testCases := []struct {
		name     string
		response string
		expected bool
	}{
		{
			name: "Direct permission with code block",
			response: `I need permission to create the Python file. The hello world program would be:

` + "```python\nprint(\"Hello, World!\")\n```" + `

Would you like me to create this as hello.py?`,
			expected: true,
		},
		{
			name: "File creation suggestion",
			response: `Here's a simple Python hello world program:

` + "```python\nprint(\"Hello, World!\")\n```" + `

Should I create this file as hello.py for you?`,
			expected: true,
		},
		{
			name: "Code explanation only (no permission needed)",
			response: `Here's how a Python hello world program works:

` + "```python\nprint(\"Hello, World!\")\n```" + `

The print() function outputs text to the console.`,
			expected: false,
		},
		{
			name: "General conversation",
			response: `Hello! I'm Claude, an AI assistant. I can help you with programming.`,
			expected: false,
		},
		{
			name: "Multiple file creation",
			response: `I'll create a web project for you:

1. Create index.html with basic structure
2. Create style.css for styling

Would you like me to create these files?`,
			expected: true,
		},
		{
			name: "Go program creation",
			response: `Here's a simple Go hello world program:

` + "```go\npackage main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}\n```" + `

Can I create this as main.go?`,
			expected: true,
		},
		{
			name: "Save file request", 
			response: `Let me save this as hello.py for you.`,
			expected: true,
		},
		{
			name: "Code review without creation",
			response: `Looking at your Python code, here are improvements: 1. Add error handling 2. Use descriptive names`,
			expected: false,
		},
	}
	
	fmt.Println("🧪 Testing Advanced Permission Detection Patterns")
	fmt.Println("==============================================")
	
	passed := 0
	total := len(testCases)
	
	for i, tc := range testCases {
		fmt.Printf("\n%d. %s\n", i+1, tc.name)
		
		permReq := pm.DetectPermissionNeeded(tc.response)
		detected := permReq != nil
		
		if detected == tc.expected {
			fmt.Printf("✅ PASS - Expected: %v, Got: %v\n", tc.expected, detected)
			if detected {
				fmt.Printf("   📁 Action: %s\n", permReq.Action)
				fmt.Printf("   🎯 Target: %s\n", permReq.Target)
				if permReq.Preview != "" {
					preview := permReq.Preview
					if len(preview) > 100 {
						preview = preview[:100] + "..."
					}
					fmt.Printf("   👀 Preview: %s\n", preview)
				}
			}
			passed++
		} else {
			fmt.Printf("❌ FAIL - Expected: %v, Got: %v\n", tc.expected, detected)
		}
		
		// Show response snippet
		snippet := strings.ReplaceAll(tc.response, "\n", " ")
		if len(snippet) > 100 {
			snippet = snippet[:100] + "..."
		}
		fmt.Printf("   💬 Response: %s\n", snippet)
	}
	
	fmt.Printf("\n📊 Test Results: %d/%d passed (%.1f%%)\n", 
		passed, total, float64(passed)/float64(total)*100)
	
	if passed == total {
		fmt.Println("🎉 All tests passed!")
	} else {
		fmt.Printf("⚠️  %d tests failed\n", total-passed)
	}
}

func main() {
	TestAdvancedPermissionPatterns()
}