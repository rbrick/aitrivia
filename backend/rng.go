package main

import (
	"crypto/rand"

	"github.com/gofrs/uuid/v5"
)

const (
	alphanumeric = "abcdefghijklmnopqrstuvwxyz0123456789"
)

func generateID(length int) string {
	buf := make([]byte, length)
	str := ""

	rand.Read(buf)

	for i := range buf {
		str += string(alphanumeric[buf[i]%byte(len(alphanumeric))])
	}

	return str
}

func generateUUID() string {
	return uuid.Must(uuid.NewV4()).String()
}
