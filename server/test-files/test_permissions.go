package main

import (
	"fmt"
	"os"
)

func main() {
	// Check if we're running in test mode
	if len(os.Args) > 1 && os.Args[1] == "test-permissions" {
		TestSimplePermissions()
		return
	}
	
	// Regular server startup would continue here
	fmt.Println("Use: go run . test-permissions")
}