package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
)

type CatalogItem struct {
	SKU   string
	Name  string
	Price string
	Stock string
}

func ProcessCSV(reader io.Reader) ([]CatalogItem, error) {
	r := csv.NewReader(reader)
	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}

	var items []CatalogItem
	for i, record := range records {
		if i == 0 {
			continue // Skip header
		}
		if len(record) >= 4 {
			items = append(items, CatalogItem{
				SKU:   record[0],
				Name:  record[1],
				Price: record[2],
				Stock: record[3],
			})
		}
	}
	return items, nil
}

func main() {
	fmt.Println("URBANIX Go Catalog Batch Worker Started.")
	file, err := os.Open("sample_catalog.csv")
	if err != nil {
		log.Println("Sample CSV file not found. Ready for stream processing.")
		return
	}
	defer file.Close()

	items, err := ProcessCSV(file)
	if err != nil {
		log.Fatalf("Error processing catalog CSV: %v", err)
	}
	fmt.Printf("Processed %d items successfully.\n", len(items))
}
