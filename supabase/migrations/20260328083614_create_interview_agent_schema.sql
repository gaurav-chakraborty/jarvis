/*
  # Create Interview Agent Schema
  
  1. New Tables
    - `interviews` - Main interview sessions
    - `questions` - Questions asked during interviews
    - `answers` - Candidate answers with agent predictions
    - `interviewer_profiles` - Dynamic interviewer personality profiles
    - `agent_memories` - Short and long-term memory storage
    - `conversation_turns` - Individual conversation turns for memory consolidation
    - `adaptive_strategies` - Strategy adjustments per interview
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
  
  3. Indexes
    - Create indexes for common queries (user_id, interview_id, timestamp)
*/

-- Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  role_title text NOT NULL,
  interviewer_names text[] DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  interview_phase text DEFAULT 'opening',
  overall_strategy text DEFAULT 'build_rapport',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own interviews"
  ON interviews
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_created_at ON interviews(created_at DESC);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text DEFAULT 'unknown',
  predicted_type text,
  prediction_confidence float DEFAULT 0,
  asked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view questions from their interviews"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = questions.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create questions for their interviews"
  ON questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE INDEX idx_questions_interview_id ON questions(interview_id);
CREATE INDEX idx_questions_asked_at ON questions(asked_at DESC);

-- Answers Table
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  ai_generated_answer text,
  user_spoke_answer text,
  confidence_score float DEFAULT 0,
  suggested_talking_points text[] DEFAULT '{}',
  interviewer_reaction text,
  user_rating int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage answers from their interviews"
  ON answers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = answers.interview_id
      AND interviews.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE INDEX idx_answers_interview_id ON answers(interview_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answers_confidence ON answers(confidence_score DESC);

-- Interviewer Profiles Table
CREATE TABLE IF NOT EXISTS interviewer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_name text NOT NULL,
  preferred_style text DEFAULT 'balanced',
  pace text DEFAULT 'moderate',
  follow_up_tendency float DEFAULT 0.5,
  technical_depth_preference float DEFAULT 0.5,
  engagement_level float DEFAULT 0.5,
  question_count int DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interviewer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage interviewer profiles for their interviews"
  ON interviewer_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interviewer_profiles.interview_id
      AND interviews.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE INDEX idx_interviewer_profiles_interview_id ON interviewer_profiles(interview_id);

-- Agent Memories Table
CREATE TABLE IF NOT EXISTS agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  topic text NOT NULL,
  memory_type text DEFAULT 'short_term',
  content text NOT NULL,
  relevance_score float DEFAULT 0,
  mention_count int DEFAULT 1,
  first_mentioned timestamptz DEFAULT now(),
  last_mentioned timestamptz DEFAULT now(),
  associated_questions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage agent memories for their interviews"
  ON agent_memories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = agent_memories.interview_id
      AND interviews.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE INDEX idx_agent_memories_interview_id ON agent_memories(interview_id);
CREATE INDEX idx_agent_memories_topic ON agent_memories(topic);
CREATE INDEX idx_agent_memories_relevance ON agent_memories(relevance_score DESC);

-- Conversation Turns Table
CREATE TABLE IF NOT EXISTS conversation_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  turn_number int NOT NULL,
  question_text text NOT NULL,
  answer_text text NOT NULL,
  interviewer_feedback text,
  topics text[] DEFAULT '{}',
  sentiment text DEFAULT 'neutral',
  engagement_level float DEFAULT 0.5,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversation_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversation turns from their interviews"
  ON conversation_turns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = conversation_turns.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversation turns for their interviews"
  ON conversation_turns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE INDEX idx_conversation_turns_interview_id ON conversation_turns(interview_id);
CREATE INDEX idx_conversation_turns_turn_number ON conversation_turns(turn_number);

-- Adaptive Strategies Table
CREATE TABLE IF NOT EXISTS adaptive_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  strategy_name text NOT NULL,
  current_phase text NOT NULL,
  interviewer_mood text DEFAULT 'neutral',
  question_difficulty float DEFAULT 0.5,
  response_quality float DEFAULT 0.5,
  tactical_adjustments text[] DEFAULT '{}',
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE adaptive_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage strategies for their interviews"
  ON adaptive_strategies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = adaptive_strategies.interview_id
      AND interviews.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE INDEX idx_adaptive_strategies_interview_id ON adaptive_strategies(interview_id);