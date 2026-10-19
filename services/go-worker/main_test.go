package main

import (
	"strings"
	"testing"
)

func TestProcessCSV(t *testing.T) {
	csvData := "sku,name,price,stock\nSKU001,Test Phone,5000000,10\nSKU002,Test Laptop,12000000,5"
	reader := strings.NewReader(csvData)

	items, err := ProcessCSV(reader)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(items) != 2 {
		t.Fatalf("Expected 2 items, got %d", len(items))
	}

	if items[0].SKU != "SKU001" || items[0].Name != "Test Phone" {
		t.Errorf("Unexpected item values: %+v", items[0])
	}
}
