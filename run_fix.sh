#!/bin/bash
mysql -u bingo_user -pBingo24K_Pass_2026 bingo_24k -e "SET GLOBAL log_bin_trust_function_creators = 1;"
mysql -u bingo_user -pBingo24K_Pass_2026 bingo_24k < /tmp/FIX_WITHDRAWAL_FUNCTION.sql
echo "Done!"
