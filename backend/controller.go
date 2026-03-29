package main

type GameController interface {
	CreateRoom(CreateRoomDTO) (*CreateRoomResponse, error)
	JoinRoom(JoinRoomDTO) (*JoinRoomResponse, error)
	GetRoom(string) (*Room, error)
}

type GameControllerImpl struct {
	game *Game
}

func (c *GameControllerImpl) CreateRoom(dto CreateRoomDTO) (*CreateRoomResponse, error) {
	if len(dto.Categories) == 0 {
		return nil, newAPIError(400, "at least one category is required")
	}

	return &CreateRoomResponse{Room: c.game.CreateRoom(&RoomConfig{
		Categories: dto.Categories,
		AnswerTime: dto.AnswerTime,
	})}, nil
}

func (c *GameControllerImpl) JoinRoom(dto JoinRoomDTO) (*JoinRoomResponse, error) {
	room, player, err := c.game.JoinRoom(dto.RoomCode, dto.PlayerName)
	if err != nil {
		return nil, err
	}

	return &JoinRoomResponse{
		Room:   room,
		Player: player,
	}, nil
}

func (c *GameControllerImpl) GetRoom(joinCode string) (*Room, error) {
	room := c.game.GetRoomByJoinCode(joinCode)
	if room == nil {
		return nil, newAPIError(404, "room not found")
	}

	return room, nil
}

func NewGameController(game *Game) *GameControllerImpl {
	return &GameControllerImpl{
		game: game,
	}
}
