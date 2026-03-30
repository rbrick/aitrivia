package main

import (
	"context"
	"fmt"
	"log"
	"maps"
	"slices"
	"strings"
	"sync"
	"time"
)

type Player struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Points int    `json:"points"`
}

type Question struct {
	ID       string   `json:"id"`
	Text     string   `json:"text"`
	Options  []string `json:"options"`
	Answer   *int     `json:"answer,omitempty"`
	Category string   `json:"category"`
}

type CurrentQuestion struct {
	Question  Question `json:"question"`
	StartTime int64    `json:"startTime"`
	EndTime   int64    `json:"endTime"`

	Answered map[string]bool `json:"answered"` // playerID -> whether they have answered
}

type RoomConfig struct {
	Categories []string `json:"categories"`
	AnswerTime int      `json:"answerTime"` // time in seconds for players to answer each question

}

type Room struct {
	ID        string      `json:"id"`
	JoinCode  string      `json:"joinCode"`
	HostID    string      `json:"hostId"`
	Started   bool        `json:"started"`
	Players   []Player    `json:"players"`
	Questions []Question  `json:"-"`
	Config    *RoomConfig `json:"config"`

	CurrentQuestion *CurrentQuestion `json:"currentQuestion,omitempty"`
}

func (r *Room) Tick() {
	if !r.Started {
		return
	}

	if r.CurrentQuestion != nil {
		// check if the current question has expired
		if time.Now().Unix() > r.CurrentQuestion.EndTime {
			// move on to the next question
			r.CurrentQuestion = r.NextQuestion()
		}
	} else {
		// if there is no current question, start the first question
		r.CurrentQuestion = r.NextQuestion()
	}
}

func (r *Room) NextQuestion() *CurrentQuestion {
	if len(r.Questions) == 0 {
		return nil
	}

	question := r.Questions[0]
	r.Questions = r.Questions[1:]

	return &CurrentQuestion{
		Question:  question,
		StartTime: time.Now().Unix(),
		EndTime:   time.Now().Add(time.Duration(r.Config.AnswerTime) * time.Second).Unix(),
		Answered:  make(map[string]bool),
	}
}

func (r *Room) CloneForPlayer(playerID string) *Room {
	hasAnswered := r.CurrentQuestion != nil && r.CurrentQuestion.Answered[playerID]
	return r.Clone(hasAnswered)
}

func (r *Room) Active() bool {
	return len(r.Players) > 0
}

func (r *Room) Clone(withAnswers bool) *Room {
	players := slices.Clone(r.Players)
	questions := slices.Clone(r.Questions)

	var config *RoomConfig
	if r.Config != nil {
		config = &RoomConfig{
			Categories: slices.Clone(r.Config.Categories),
			AnswerTime: r.Config.AnswerTime,
		}
	}

	var currentQuestion *CurrentQuestion
	if r.CurrentQuestion != nil {
		currentQuestion = &CurrentQuestion{
			Question:  r.CurrentQuestion.Question,
			StartTime: r.CurrentQuestion.StartTime,
			EndTime:   r.CurrentQuestion.EndTime,
			Answered:  maps.Clone(r.CurrentQuestion.Answered),
		}
		if !withAnswers {
			currentQuestion.Question.Answer = nil
		}
	}

	return &Room{
		ID:              r.ID,
		JoinCode:        r.JoinCode,
		HostID:          r.HostID,
		Started:         r.Started,
		Players:         players,
		Questions:       questions,
		Config:          config,
		CurrentQuestion: currentQuestion,
	}
}

func (r *Room) Join(player Player) error {
	for _, existingPlayer := range r.Players {
		if strings.EqualFold(existingPlayer.Name, player.Name) {
			return newAPIError(409, fmt.Sprintf("player name %q is already in use", player.Name))
		}
	}

	r.Players = append(r.Players, player)

	return nil
}

func (r *Room) Start() error {
	if r.Started {
		return newAPIError(409, "game has already started")
	}
	r.Started = true
	r.CurrentQuestion = r.NextQuestion()
	return nil
}

func (r *Room) GetPlayer(playerID string) *Player {
	for index := range r.Players {
		if r.Players[index].ID == playerID {
			return &r.Players[index]
		}
	}

	return nil
}

type SubmitAnswerResult struct {
	PointsRewarded int  `json:"pointsRewarded"`
	Correct        bool `json:"correct"`
	CorrectAnswer  int  `json:"correctAnswer,omitempty"`
}

func (r *Room) SubmitAnswer(playerID string, answer int) (SubmitAnswerResult, error) {
	if r.CurrentQuestion == nil {
		return SubmitAnswerResult{}, newAPIError(409, "there is no active question")
	}

	if time.Now().Unix() > r.CurrentQuestion.EndTime {
		return SubmitAnswerResult{}, newAPIError(409, "the current question is already closed")
	}

	player := r.GetPlayer(playerID)
	if player == nil {
		return SubmitAnswerResult{}, newAPIError(404, "player not found")
	}

	if answer < 0 || answer >= len(r.CurrentQuestion.Question.Options) {
		return SubmitAnswerResult{}, newAPIError(400, "answer index is out of range")
	}

	if r.CurrentQuestion.Answered[playerID] {
		return SubmitAnswerResult{}, newAPIError(409, "player has already answered this question")
	}

	r.CurrentQuestion.Answered[playerID] = true

	if r.CurrentQuestion.Question.Answer == nil {
		return SubmitAnswerResult{}, newAPIError(500, "question has no answer configured")
	}
	correctAnswer := *r.CurrentQuestion.Question.Answer

	log.Println(r.CurrentQuestion.Question)
	if correctAnswer == answer {
		// TODO(ryan): configurable point rewarding system
		// example: Who Wants to Be a Millionaire style rewarding where points increase for each subsequent question
		// or a system where points are based on how quickly the player answered the question
		// for now, just reward a flat 10 points for a correct answer
		player.Points += 10
		return SubmitAnswerResult{
			PointsRewarded: 10,
			Correct:        true,
			CorrectAnswer:  correctAnswer,
		}, nil
	}

	return SubmitAnswerResult{
		PointsRewarded: 0,
		Correct:        false,
		CorrectAnswer:  correctAnswer,
	}, nil
}

func (r *Room) Leave(playerID string) bool {
	playersBefore := len(r.Players)
	r.Players = slices.DeleteFunc(r.Players, func(p Player) bool {
		return p.ID == playerID
	})

	return len(r.Players) != playersBefore
}

type Game struct {
	mu        sync.RWMutex
	joinCodes map[string]string // joinCode -> roomID
	rooms     map[string]*Room  // roomID -> Room
	agent     Agent
}

type AnswerResult struct {
	Room           *Room `json:"room"`
	PointsRewarded int   `json:"pointsRewarded"`
	Correct        bool  `json:"correct"`
	CorrectAnswer  int   `json:"correctAnswer,omitempty"`
}

func (g *Game) Tick() []*Room {
	g.mu.Lock()
	defer g.mu.Unlock()

	changedRooms := make([]*Room, 0)

	// tick active rooms
	for _, room := range g.rooms {
		if room.Active() {
			previousQuestion := room.CurrentQuestion
			room.Tick()
			if previousQuestion != room.CurrentQuestion {
				changedRooms = append(changedRooms, room.Clone(false))
			}
		}
	}

	// remove inactive rooms
	for id, room := range g.rooms {
		if !room.Active() {
			g.deleteRoomLocked(id, room.JoinCode)
		}
	}

	return changedRooms
}

func (g *Game) GetRoomByJoinCode(joinCode string) *Room {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, err := g.roomByJoinCodeLocked(joinCode)
	if err != nil {
		return nil
	}

	return room.Clone(false)
}

func (g *Game) GetRoomForPlayer(roomID, playerID string) *Room {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, err := g.roomLocked(roomID)
	if err != nil {
		return nil
	}

	return room.CloneForPlayer(playerID)
}

func (g *Game) GetRoom(roomID string) *Room {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, err := g.roomLocked(roomID)
	if err != nil {
		return nil
	}

	return room.Clone(false)
}

func (g *Game) generateQuestions(roomConfig *RoomConfig) []Question {
	questions, err := g.agent.GenerateQuestions(context.Background(), roomConfig.Categories, 10)
	if err != nil {
		return []Question{}
	}

	for index := range questions {
		if questions[index].ID == "" {
			questions[index].ID = generateUUID()
		}
	}

	return questions
}

func (g *Game) CreateRoom(config *RoomConfig) *Room {
	config = normalizeRoomConfig(config)
	questions := g.generateQuestions(config)

	g.mu.Lock()
	defer g.mu.Unlock()

	roomId := generateUUID() // create a UUIDv4 for the room
	joinCode := g.generateJoinCodeLocked()
	room := &Room{
		ID:        roomId, // use the generated UUIDv4 for the room
		JoinCode:  joinCode,
		Players:   []Player{},
		Questions: questions,
		Config:    config,
	}

	g.rooms[room.ID] = room
	g.joinCodes[joinCode] = room.ID

	return room.Clone(false)
}

func (g *Game) JoinRoom(joinCode string, playerName string) (*Room, *Player, error) {
	trimmedCode := strings.ToLower(strings.TrimSpace(joinCode))
	trimmedPlayerName := strings.TrimSpace(playerName)
	if trimmedCode == "" {
		return nil, nil, newAPIError(400, "room code is required")
	}
	if trimmedPlayerName == "" {
		return nil, nil, newAPIError(400, "player name is required")
	}

	g.mu.Lock()
	defer g.mu.Unlock()

	room, err := g.roomByJoinCodeLocked(trimmedCode)
	if err != nil {
		return nil, nil, err
	}

	player := Player{
		ID:     generateUUID(),
		Name:   trimmedPlayerName,
		Points: 0,
	}
	if room.HostID == "" {
		room.HostID = player.ID
	}
	if err := room.Join(player); err != nil {
		return nil, nil, err
	}

	playerCopy := player

	return room.Clone(false), &playerCopy, nil
}

func (g *Game) LeaveRoom(roomID string, playerID string) (*Room, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, err := g.roomLocked(roomID)
	if err != nil {
		return nil, err
	}

	if !room.Leave(playerID) {
		return nil, newAPIError(404, "player not found")
	}

	if !room.Active() {
		g.deleteRoomLocked(room.ID, room.JoinCode)
		return nil, nil
	}

	if room.HostID == playerID {
		room.HostID = room.Players[0].ID
	}

	return room.Clone(false), nil
}

func (g *Game) StartGame(roomID, playerID string) (*Room, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, err := g.roomLocked(roomID)
	if err != nil {
		return nil, err
	}

	if room.HostID != playerID {
		return nil, newAPIError(403, "only the host can start the game")
	}

	if err := room.Start(); err != nil {
		return nil, err
	}

	return room.Clone(false), nil
}

func (g *Game) SubmitAnswer(roomID string, playerID string, answer int) (*AnswerResult, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, err := g.roomLocked(roomID)
	if err != nil {
		return nil, err
	}

	result, err := room.SubmitAnswer(playerID, answer)
	if err != nil {
		return nil, err
	}

	return &AnswerResult{
		Room:           room.CloneForPlayer(playerID),
		PointsRewarded: result.PointsRewarded,
		Correct:        result.Correct,
		CorrectAnswer:  result.CorrectAnswer,
	}, nil
}

func (g *Game) generateJoinCodeLocked() string {
	for {
		joinCode := generateID(8)
		if _, exists := g.joinCodes[joinCode]; !exists {
			return joinCode
		}
	}
}

func (g *Game) roomByJoinCodeLocked(joinCode string) (*Room, error) {
	roomID, exists := g.joinCodes[joinCode]
	if !exists {
		return nil, newAPIError(404, "room not found")
	}

	return g.roomLocked(roomID)
}

func (g *Game) roomLocked(roomID string) (*Room, error) {
	room, exists := g.rooms[roomID]
	if !exists {
		return nil, newAPIError(404, "room not found")
	}

	return room, nil
}

func (g *Game) deleteRoomLocked(roomID string, joinCode string) {
	delete(g.joinCodes, joinCode)
	delete(g.rooms, roomID)
}

func normalizeRoomConfig(config *RoomConfig) *RoomConfig {
	if config == nil {
		config = &RoomConfig{}
	}

	normalizedConfig := &RoomConfig{
		Categories: append([]string(nil), config.Categories...),
		AnswerTime: config.AnswerTime,
	}

	if normalizedConfig.AnswerTime <= 0 {
		normalizedConfig.AnswerTime = 20
	}

	return normalizedConfig
}
