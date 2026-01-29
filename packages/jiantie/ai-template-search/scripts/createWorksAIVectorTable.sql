-- 创建用户作品 AI 向量表
-- 用于存储用户作品内容的向量（作为匹配模版的查询语料）
-- 与 template_ai_vectors 分表存储，便于区分与治理

CREATE TABLE IF NOT EXISTS works_ai_vectors (
  works_id TEXT NOT NULL,
  uid BIGINT NOT NULL,
  appid TEXT,
  meta JSONB,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (works_id)
);

-- 创建向量索引（使用 HNSW 索引提升搜索性能）
CREATE INDEX IF NOT EXISTS works_ai_vectors_embedding_idx
  ON works_ai_vectors
  USING hnsw (embedding vector_cosine_ops);

-- 创建 uid 索引（便于按用户过滤/回溯）
CREATE INDEX IF NOT EXISTS works_ai_vectors_uid_idx
  ON works_ai_vectors (uid);

-- 创建 appid 索引
CREATE INDEX IF NOT EXISTS works_ai_vectors_appid_idx
  ON works_ai_vectors (appid);

-- meta JSONB 索引（可选：用于后续按标签/字段过滤）
CREATE INDEX IF NOT EXISTS works_ai_vectors_meta_gin_idx
  ON works_ai_vectors USING GIN (meta);

