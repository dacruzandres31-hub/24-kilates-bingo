#!/bin/bash
# Check users table schema

mysql -u bingo_user -p'Bingo24K_Pass_2026' bingo_24k -e "SHOW COLUMNS FROM users"
