CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_default_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();

-- Clean up pg_largeobject blobs when task_attachments row is
-- deleted or its large_object_oid is changed.
CREATE TRIGGER task_attachments_lo_cleanup
    BEFORE UPDATE OR DELETE ON task_attachments
    FOR EACH ROW
    EXECUTE FUNCTION lo_manage(large_object_oid);
