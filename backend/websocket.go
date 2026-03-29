package main

import (
	"encoding/json"
	"log"

	"github.com/labstack/echo/v5"
	"github.com/olahol/melody"
)

const (
	sessionRoomIDKey   = "roomID"
	sessionPlayerIDKey = "playerID"
)

type ClientMessageType string

const (
	ClientMessageTypeSubmitAnswer ClientMessageType = "submit_answer"
)

type ServerMessageType string

const (
	ServerMessageTypeAnswerResult ServerMessageType = "answer_result"
	ServerMessageTypeError        ServerMessageType = "error"
	ServerMessageTypeRoomState    ServerMessageType = "room_state"
	ServerMessageTypeSessionReady ServerMessageType = "session_ready"
)

type ClientMessage struct {
	Type   ClientMessageType `json:"type"`
	Answer int               `json:"answer,omitempty"`
}

type ServerMessage struct {
	Type           ServerMessageType `json:"type"`
	Error          string            `json:"error,omitempty"`
	PlayerID       string            `json:"playerId,omitempty"`
	Room           *Room             `json:"room,omitempty"`
	PointsRewarded int               `json:"pointsRewarded,omitempty"`
	Correct        *bool             `json:"correct,omitempty"`
	CorrectAnswer  *int              `json:"correctAnswer,omitempty"`
}

type SocketProtocol interface {
	ParseClientMessage(payload []byte) (*ClientMessage, error)
	Error(message string) ServerMessage
	SessionReady(playerID string, room *Room) ServerMessage
	RoomState(room *Room) ServerMessage
	AnswerResult(result *AnswerResult) ServerMessage
}

type JSONSocketProtocol struct{}

func (p JSONSocketProtocol) ParseClientMessage(payload []byte) (*ClientMessage, error) {
	var message ClientMessage
	if err := json.Unmarshal(payload, &message); err != nil {
		return nil, err
	}

	return &message, nil
}

func (p JSONSocketProtocol) Error(message string) ServerMessage {
	return ServerMessage{
		Type:  ServerMessageTypeError,
		Error: message,
	}
}

func (p JSONSocketProtocol) SessionReady(playerID string, room *Room) ServerMessage {
	return ServerMessage{
		Type:     ServerMessageTypeSessionReady,
		PlayerID: playerID,
		Room:     room,
	}
}

func (p JSONSocketProtocol) RoomState(room *Room) ServerMessage {
	return ServerMessage{
		Type: ServerMessageTypeRoomState,
		Room: room,
	}
}

func (p JSONSocketProtocol) AnswerResult(result *AnswerResult) ServerMessage {
	return ServerMessage{
		Type:           ServerMessageTypeAnswerResult,
		Room:           result.Room,
		PointsRewarded: result.PointsRewarded,
		Correct:        &result.Correct,
		CorrectAnswer:  &result.CorrectAnswer,
	}
}

type GameSocketHub struct {
	game     *Game
	melody   *melody.Melody
	protocol SocketProtocol
}

type websocketSessionState struct {
	roomID   string
	playerID string
}

func NewGameSocketHub(game *Game, socket *melody.Melody) *GameSocketHub {
	hub := &GameSocketHub{
		game:     game,
		melody:   socket,
		protocol: JSONSocketProtocol{},
	}

	hub.registerHandlers()

	return hub
}

func (h *GameSocketHub) HandleWebsocket(c *echo.Context) error {
	room, player, err := h.game.JoinRoom(c.QueryParam("roomCode"), c.QueryParam("playerName"))
	if err != nil {
		return writeErrorResponse(c, err)
	}

	if err := h.melody.HandleRequestWithKeys(c.Response(), c.Request(), map[string]any{
		sessionRoomIDKey:   room.ID,
		sessionPlayerIDKey: player.ID,
	}); err != nil {
		_, leaveErr := h.game.LeaveRoom(room.ID, player.ID)
		if leaveErr != nil {
			log.Printf("rollback failed after websocket upgrade error: %v", leaveErr)
		}

		return err
	}

	return nil
}

func (h *GameSocketHub) BroadcastRoomState(roomID string) error {
	return h.broadcastRoomState(roomID, nil)
}

func (h *GameSocketHub) registerHandlers() {
	h.melody.HandleConnect(h.handleConnect)
	h.melody.HandleDisconnect(h.handleDisconnect)
	h.melody.HandleError(func(session *melody.Session, err error) {
		log.Printf("websocket error: %v", err)
	})
	h.melody.HandleMessage(h.handleMessage)
}

func (h *GameSocketHub) handleConnect(session *melody.Session) {
	state, ok := sessionState(session)
	if !ok {
		h.closeSession(session, "close invalid websocket session")
		return
	}

	room := h.game.GetRoomForPlayer(state.roomID, state.playerID)
	if room == nil {
		h.closeSession(session, "close websocket for missing room")
		return
	}

	if err := h.writeSessionMessage(session, h.protocol.SessionReady(state.playerID, room)); err != nil {
		log.Printf("write session_ready message: %v", err)
	}

	if err := h.broadcastRoomState(state.roomID, session); err != nil {
		log.Printf("broadcast room state after connect: %v", err)
	}
}

func (h *GameSocketHub) handleDisconnect(session *melody.Session) {
	state, ok := sessionState(session)
	if !ok {
		return
	}

	room, err := h.game.LeaveRoom(state.roomID, state.playerID)
	if err != nil {
		log.Printf("leave room on disconnect: %v", err)
		return
	}

	if room == nil {
		return
	}

	if err := h.BroadcastRoomState(room.ID); err != nil {
		log.Printf("broadcast room state after disconnect: %v", err)
	}
}

func (h *GameSocketHub) handleMessage(session *melody.Session, payload []byte) {
	message, err := h.protocol.ParseClientMessage(payload)
	if err != nil {
		h.writeSessionError(session, "invalid websocket message")
		return
	}

	switch message.Type {
	case ClientMessageTypeSubmitAnswer:
		h.handleSubmitAnswer(session, *message)
	default:
		h.writeSessionError(session, "unsupported websocket message type")
	}
}

func (h *GameSocketHub) handleSubmitAnswer(session *melody.Session, message ClientMessage) {
	state, ok := sessionState(session)
	if !ok {
		h.writeSessionError(session, "session is missing room or player state")
		return
	}

	result, err := h.game.SubmitAnswer(state.roomID, state.playerID, message.Answer)
	if err != nil {
		h.writeSessionError(session, err.Error())
		return
	}

	if err := h.writeSessionMessage(session, h.protocol.AnswerResult(result)); err != nil {
		log.Printf("write answer_result message: %v", err)
	}

	if err := h.broadcastRoomState(result.Room.ID, session); err != nil {
		log.Printf("broadcast room state after answer: %v", err)
	}
}

func (h *GameSocketHub) broadcastToRoom(roomID string, message ServerMessage) error {
	return h.broadcastToRoomExcept(roomID, message, nil)
}

func (h *GameSocketHub) broadcastRoomState(roomID string, excludedSession *melody.Session) error {
	sessions, err := h.melody.Sessions()
	if err != nil {
		return err
	}

	for _, session := range sessions {
		if session == excludedSession {
			continue
		}

		sessionRoomID, ok := sessionString(session, sessionRoomIDKey)
		if !ok || sessionRoomID != roomID {
			continue
		}

		playerID, ok := sessionString(session, sessionPlayerIDKey)
		if !ok {
			continue
		}

		room := h.game.GetRoomForPlayer(roomID, playerID)
		if room == nil {
			continue
		}

		if err := h.writeSessionMessage(session, h.protocol.RoomState(room)); err != nil {
			log.Printf("broadcast room state to player %s: %v", playerID, err)
		}
	}

	return nil
}

func (h *GameSocketHub) broadcastToRoomExcept(roomID string, message ServerMessage, excludedSession *melody.Session) error {
	payload, err := marshalServerMessage(message)
	if err != nil {
		return err
	}

	return h.melody.BroadcastFilter(payload, func(session *melody.Session) bool {
		if session == excludedSession {
			return false
		}

		sessionRoomID, ok := sessionString(session, sessionRoomIDKey)
		return ok && sessionRoomID == roomID
	})
}

func (h *GameSocketHub) writeSessionMessage(session *melody.Session, message ServerMessage) error {
	payload, err := marshalServerMessage(message)
	if err != nil {
		return err
	}

	return session.Write(payload)
}

func (h *GameSocketHub) writeSessionError(session *melody.Session, message string) {
	if err := h.writeSessionMessage(session, h.protocol.Error(message)); err != nil {
		log.Printf("write websocket error message: %v", err)
	}
}

func (h *GameSocketHub) closeSession(session *melody.Session, logMessage string) {
	if err := session.Close(); err != nil {
		log.Printf("%s: %v", logMessage, err)
	}
}

func sessionState(session *melody.Session) (*websocketSessionState, bool) {
	roomID, roomIDOk := sessionString(session, sessionRoomIDKey)
	playerID, playerIDOk := sessionString(session, sessionPlayerIDKey)
	if !roomIDOk || !playerIDOk {
		return nil, false
	}

	return &websocketSessionState{
		roomID:   roomID,
		playerID: playerID,
	}, true
}

func marshalServerMessage(message ServerMessage) ([]byte, error) {
	return json.Marshal(message)
}

func sessionString(session *melody.Session, key string) (string, bool) {
	value, exists := session.Get(key)
	if !exists {
		return "", false
	}

	stringValue, ok := value.(string)
	if !ok {
		return "", false
	}

	return stringValue, true
}
