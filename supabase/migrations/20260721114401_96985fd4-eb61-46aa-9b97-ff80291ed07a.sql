
CREATE OR REPLACE FUNCTION public.get_charts_by_period(
  p_scope text DEFAULT 'global',
  p_region text DEFAULT NULL,
  p_period text DEFAULT 'weekly',
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  track_id uuid,
  play_count bigint,
  last_played_at timestamptz,
  region_country text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz;
BEGIN
  v_since := CASE lower(p_period)
    WHEN 'daily' THEN now() - interval '1 day'
    WHEN 'weekly' THEN now() - interval '7 days'
    WHEN 'monthly' THEN now() - interval '30 days'
    ELSE now() - interval '7 days'
  END;

  IF lower(p_scope) = 'regional' AND p_region IS NOT NULL AND length(p_region) > 0 THEN
    RETURN QUERY
    SELECT sl.track_id,
           count(*)::bigint AS play_count,
           max(sl.created_at) AS last_played_at,
           p_region AS region_country
    FROM stream_logs sl
    JOIN tracks t ON t.id = sl.track_id AND t.published = true
    WHERE sl.created_at >= v_since
      AND sl.region_country = p_region
    GROUP BY sl.track_id
    ORDER BY play_count DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT sl.track_id,
           count(*)::bigint AS play_count,
           max(sl.created_at) AS last_played_at,
           NULL::text AS region_country
    FROM stream_logs sl
    JOIN tracks t ON t.id = sl.track_id AND t.published = true
    WHERE sl.created_at >= v_since
    GROUP BY sl.track_id
    ORDER BY play_count DESC
    LIMIT p_limit;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_charts_by_period(text, text, text, integer) TO anon, authenticated;
