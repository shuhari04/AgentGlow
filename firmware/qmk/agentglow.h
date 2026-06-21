/* SPDX-License-Identifier: MIT */
#pragma once

#include <stdbool.h>
#include <stdint.h>

bool agentglow_command(uint8_t *data, uint8_t length);
void agentglow_task(void);
void agentglow_restore(void);
void agentglow_color(uint8_t index, uint8_t *red, uint8_t *green, uint8_t *blue);
