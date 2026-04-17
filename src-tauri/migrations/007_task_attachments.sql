CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('link', 'text', 'file')),
    title TEXT NOT NULL,
    url TEXT,
    content TEXT,
    large_object_oid OID,
    content_type TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (kind = 'link' AND url IS NOT NULL) OR
        (kind = 'text' AND content IS NOT NULL) OR
        (kind = 'file' AND large_object_oid IS NOT NULL AND content_type IS NOT NULL)
    )
);

CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
