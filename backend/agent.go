package main

import (
	"context"
	"encoding/json"

	"charm.land/fantasy"
)

const (
	SystemPrompt = `You are a trivia question generator. Your task is to generate trivia questions based on the given category. Each question should have 4 options and one correct answer. The questions should be challenging but not too difficult, and they should be relevant to the category provided. Please ensure that the questions are clear and concise, and that the options are plausible but only one is correct.
	You should return the questions in the following JSON format:
	{
	  "category": "Category Name",
	  "text": "Question text",
	  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
	  "answer": 0 // index of the correct option (0-3)
	}

	You can generate an array of questions for multiple categories by providing an array of categories and the number of questions to generate for each category. The response should be in the following JSON format:
	[
	  {
	    "category": "Category Name",
	    "text": "Question text",
	    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
	    "answer": 0 // index of the correct option (0-3)
	  },
	  ...
	]

	You should take in JSON input in the following format for generating questions for multiple categories:
	{
	  "categories": ["Category 1", "Category 2", ...],
	  "numQuestions": 5 // number of questions to generate IN TOTAL
	}

	and generate questions for each category accordingly. The response should be in the same format as mentioned above for multiple categories.

	Randomize the questions and options each time, so that the same input can yield different questions.
	Randomize the order of the options for each question, but ensure that the correct answer index is updated accordingly to reflect the new order of options.

	ENSURE THE CORRECT ANSWER IS PRESENT IN THE OPTIONS AND THAT THE ANSWER INDEX IS ACCURATE.
	`
)

type Agent interface {
	GenerateQuestion(ctx context.Context, category string) (*Question, error)
	GenerateQuestions(ctx context.Context, categories []string, numQuestions int) ([]Question, error)
}

type AgentImpl struct {
	// LLM provider
	provider fantasy.Provider

	agent fantasy.Agent
}

func NewAgent(ctx context.Context, model string, provider fantasy.Provider) (*AgentImpl, error) {
	llm, err := provider.LanguageModel(ctx, model)

	if err != nil {
		return nil, err
	}

	agent := fantasy.NewAgent(llm, fantasy.WithSystemPrompt(SystemPrompt), fantasy.WithTemperature(0.0))

	return &AgentImpl{
		provider: provider,
		agent:    agent,
	}, nil
}

func floatp(f float64) *float64 {
	return &f
}

func (a *AgentImpl) GenerateQuestion(ctx context.Context, category string) (*Question, error) {
	questions, err := a.GenerateQuestions(ctx, []string{category}, 1)
	if err != nil {
		return nil, err
	}
	if len(questions) == 0 {
		return nil, nil
	}
	return &questions[0], nil
}

func (a *AgentImpl) GenerateQuestions(ctx context.Context, categories []string, numQuestions int) ([]Question, error) {

	input := map[string]interface{}{
		"categories":   categories,
		"numQuestions": numQuestions,
	}

	jsonMsg, err := json.Marshal(input)

	if err != nil {
		return nil, err
	}

	response, err := a.agent.Generate(ctx, fantasy.AgentCall{
		Temperature: floatp(0.0),
		Prompt:      string(jsonMsg),
	})

	if err != nil {
		return nil, err
	}

	var questions []Question
	if err := json.Unmarshal([]byte(response.Response.Content.Text()), &questions); err != nil {
		return nil, err
	}

	return questions, nil
}
