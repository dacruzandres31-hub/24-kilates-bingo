SELECT room, day_of_week, hour, is_active 
FROM schedule_settings 
WHERE room = 'starter' 
ORDER BY day_of_week, hour;
