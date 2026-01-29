-- 创建模版 AI 向量表
-- 用于存储 AI 生成海报功能的模版向量数据
-- 与现有的 templates 表完全隔离

CREATE TABLE IF NOT EXISTS template_ai_vectors (
  template_id TEXT NOT NULL,
  appid TEXT,
  meta JSONB,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (template_id, appid)
);

-- 创建向量索引（使用 HNSW 索引提升搜索性能）
CREATE INDEX IF NOT EXISTS template_ai_vectors_embedding_idx 
  ON template_ai_vectors 
  USING hnsw (embedding vector_cosine_ops);

-- 创建 template_id 索引
CREATE INDEX IF NOT EXISTS template_ai_vectors_template_id_idx 
  ON template_ai_vectors (template_id);

-- 创建 appid 索引
CREATE INDEX IF NOT EXISTS template_ai_vectors_appid_idx 
  ON template_ai_vectors (appid);

-- 创建 meta JSONB 索引（用于标签过滤）
CREATE INDEX IF NOT EXISTS template_ai_vectors_meta_scene_tags_idx 
  ON template_ai_vectors USING GIN ((meta->'scene_tags'));

CREATE INDEX IF NOT EXISTS template_ai_vectors_meta_industry_tags_idx 
  ON template_ai_vectors USING GIN ((meta->'industry_tags'));
