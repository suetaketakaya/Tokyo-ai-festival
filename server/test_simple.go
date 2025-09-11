package main

import "fmt"

func TestSimplePermissions() {
	pm := NewPermissionManager()
	
	// Test simple cases
	testCases := []struct {
		name     string
		response string 
		expected bool
	}{
		{
			"Permission phrase",
			"I need permission to create hello.py",
			true,
		},
		{
			"Create file request", 
			"Would you like me to create this as test.js",
			true,
		},
		{
			"Code explanation only",
			"Here's how Python works: print() outputs text",
			false,
		},
		{
			"General conversation",
			"Hello! How can I help you today?",
			false,
		},
	}
	
	fmt.Println("🧪 Simple Permission Detection Test")
	fmt.Println("==================================")
	
	passed := 0
	for i, tc := range testCases {
		permReq := pm.DetectPermissionNeeded(tc.response)
		detected := permReq != nil
		
		fmt.Printf("%d. %s\n", i+1, tc.name)
		if detected == tc.expected {
			fmt.Printf("   ✅ PASS\n")
			if detected {
				fmt.Printf("   📁 Action: %s, Target: %s\n", permReq.Action, permReq.Target)
			}
			passed++
		} else {
			fmt.Printf("   ❌ FAIL - Expected: %v, Got: %v\n", tc.expected, detected)
		}
	}
	
	fmt.Printf("\n📊 Results: %d/%d passed\n", passed, len(testCases))
}