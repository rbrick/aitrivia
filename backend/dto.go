package main

type CreateRoomDTO struct {
	Categories []string `json:"categories"`
	AnswerTime int      `json:"answerTime"` // time in seconds for players to answer each question
}

type CreateRoomResponse struct {
	Room *Room `json:"room"`
}

type JoinRoomDTO struct {
	RoomCode   string `json:"roomCode"`
	PlayerName string `json:"playerName"`
}

type JoinRoomResponse struct {
	Room   *Room   `json:"room"`
	Player *Player `json:"player"`
}

type LeaveRoomDTO struct {
	PlayerName string `json:"playerName"`
}

type LeaveRoomResponse struct {
	Room *Room `json:"room"`
}
