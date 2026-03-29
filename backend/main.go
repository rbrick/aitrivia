package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"charm.land/fantasy"
	"charm.land/fantasy/providers/openai"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/olahol/melody"
)

func init() {
	godotenv.Load()
}

func makeAgent() (Agent, error) {
	var provider fantasy.Provider
	var err error

	switch llmProvider := os.Getenv("LLM_PROVIDER"); llmProvider {
	case "openai":
		provider, err = openai.New(openai.WithAPIKey(os.Getenv("LLM_API_KEY")))
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", llmProvider)
	}

	if err != nil {
		return nil, err
	}

	agent, err := NewAgent(context.Background(), os.Getenv("LLM_MODEL"), provider)
	if err != nil {
		return nil, err
	}

	return agent, nil
}

func main() {
	aiAgent, err := makeAgent()
	if err != nil {
		log.Fatalln(err)
	}

	melodyInstance := melody.New()
	echoRouter := echo.New()
	echoRouter.Use(middleware.Recover())
	echoRouter.Use(middleware.CORS("*"))

	// game logic handler
	game := &Game{
		rooms:     make(map[string]*Room),
		joinCodes: make(map[string]string),
		agent:     aiAgent,
	}

	// controller for handling game logic
	controller := NewGameController(game)
	socketHub := NewGameSocketHub(game, melodyInstance)

	go func() {
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()

		for range ticker.C {
			changedRooms := game.Tick()
			for _, room := range changedRooms {
				if err := socketHub.BroadcastRoomState(room.ID); err != nil {
					log.Printf("broadcast room state: %v", err)
				}
			}
		}
	}()

	echoRouter.POST("/rooms/create", Wrap(controller.CreateRoom))
	echoRouter.GET("/rooms/:joinCode", func(c *echo.Context) error {
		room, err := controller.GetRoom(c.Param("joinCode"))
		if err != nil {
			return writeErrorResponse(c, err)
		}

		return c.JSON(200, room)
	})
	echoRouter.GET("/ws", socketHub.HandleWebsocket)
	echoRouter.GET("/health", func(c *echo.Context) error {
		return c.JSON(200, map[string]string{"status": "ok"})
	})

	host := os.Getenv("HOST")
	if host == "" {
		host = ":8080"
	}

	log.Printf("listening on %s", host)
	if err := echoRouter.Start(host); err != nil {
		log.Fatalln(err)
	}
}
