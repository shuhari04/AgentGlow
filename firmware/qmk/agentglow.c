/* SPDX-License-Identifier: MIT */
#include "agentglow.h"
#include "quantum.h"
#include "raw_hid.h"
#include "rgb_matrix.h"
#include "timer.h"

#define AG_MAGIC_0 0xB0
#define AG_MAGIC_1 0x47
#define AG_VERSION 1
#define AG_HELLO 0x01
#define AG_CAPABILITIES 0x02
#define AG_SET_STATE 0x03
#define AG_KEY_EVENTS 0x04
#define AG_HEARTBEAT 0x05
#define AG_RESTORE 0x06
#define AG_ACK 0x7F
#define AG_IDLE 0
#define AG_COMPLETE 4
#define AG_ERROR 5
#define AG_WATCHDOG_MS 3000
#define AG_COMPLETE_DURATION_MS 1600
#define AG_ERROR_DURATION_MS 2200

static uint8_t levels[RGB_MATRIX_LED_COUNT];
static uint8_t state;
static uint8_t hue = 145;
static uint8_t saturation = 255;
static uint8_t intensity = 180;
static uint32_t last_heartbeat;
static uint32_t last_decay;
static uint32_t state_started;
static bool active;
static bool saved_enabled;
static uint8_t saved_mode;
static uint8_t saved_hue;
static uint8_t saved_sat;
static uint8_t saved_val;

static void save_and_activate(void) {
    if (!active) {
        saved_enabled = rgb_matrix_is_enabled();
        saved_mode = rgb_matrix_get_mode();
        saved_hue = rgb_matrix_get_hue();
        saved_sat = rgb_matrix_get_sat();
        saved_val = rgb_matrix_get_val();
    }
    active = true;
    last_heartbeat = timer_read32();
    state_started = last_heartbeat;
    rgb_matrix_enable_noeeprom();
    rgb_matrix_mode_noeeprom(RGB_MATRIX_CUSTOM_agentglow);
}

void agentglow_restore(void) {
    if (!active) return;
    active = false;
    memset(levels, 0, sizeof(levels));
    rgb_matrix_sethsv_noeeprom(saved_hue, saved_sat, saved_val);
    rgb_matrix_mode_noeeprom(saved_mode);
    if (!saved_enabled) rgb_matrix_disable_noeeprom();
}

static void reply(uint8_t opcode, uint8_t sequence) {
    uint8_t response[32] = {AG_MAGIC_0, AG_MAGIC_1, AG_VERSION, opcode, 3, sequence};
    response[6] = RGB_MATRIX_LED_COUNT;
    response[7] = 0x07; /* states, per-key events, restore */
    response[8] = 12;   /* max events per packet */
    raw_hid_send(response, sizeof(response));
}

bool agentglow_command(uint8_t *data, uint8_t length) {
    if (length < 6 || data[0] != AG_MAGIC_0 || data[1] != AG_MAGIC_1 || data[2] != AG_VERSION) return false;
    uint8_t opcode = data[3];
    uint8_t payload_length = data[4];
    if (payload_length > 26 || payload_length + 6 > length) return true;
    switch (opcode) {
        case AG_HELLO:
            reply(AG_CAPABILITIES, data[5]);
            break;
        case AG_SET_STATE:
            if (payload_length >= 4) {
                save_and_activate();
                state = data[6]; hue = data[7]; saturation = data[8]; intensity = data[9];
                state_started = timer_read32();
                if (state == AG_IDLE) agentglow_restore();
            }
            break;
        case AG_KEY_EVENTS:
            save_and_activate();
            if (payload_length >= 1) {
                uint8_t count = data[6] > 12 ? 12 : data[6];
                for (uint8_t i = 0; i < count && (uint8_t)(7 + i * 2 + 1) < (uint8_t)(6 + payload_length); i++) {
                    uint8_t led = data[7 + i * 2];
                    if (led < RGB_MATRIX_LED_COUNT) levels[led] = data[8 + i * 2];
                }
            }
            break;
        case AG_HEARTBEAT:
            last_heartbeat = timer_read32();
            break;
        case AG_RESTORE:
            agentglow_restore();
            break;
        default:
            reply(AG_ACK, data[5]);
            break;
    }
    return true;
}

void agentglow_task(void) {
    if (!active) return;
    if (timer_elapsed32(last_heartbeat) > AG_WATCHDOG_MS) {
        agentglow_restore();
        return;
    }
    if ((state == AG_COMPLETE && timer_elapsed32(state_started) > AG_COMPLETE_DURATION_MS) ||
        (state == AG_ERROR && timer_elapsed32(state_started) > AG_ERROR_DURATION_MS)) {
        agentglow_restore();
        return;
    }
    if (timer_elapsed32(last_decay) >= 20) {
        last_decay = timer_read32();
        for (uint8_t i = 0; i < RGB_MATRIX_LED_COUNT; i++) levels[i] = levels[i] > 8 ? levels[i] - 8 : 0;
    }
}

void bluetooth_post_task(void) {
    agentglow_task();
}

void agentglow_color(uint8_t index, uint8_t *red, uint8_t *green, uint8_t *blue) {
    if (!active || index >= RGB_MATRIX_LED_COUNT) { *red = *green = *blue = 0; return; }
    uint8_t value = ((uint16_t)levels[index] * intensity) / 255;
    if (state == AG_COMPLETE) {
        uint8_t phase = (timer_elapsed32(state_started) / 8) & 0xFF;
        int16_t distance_signed = (int16_t)g_led_config.point[index].x - 112;
        uint8_t distance = distance_signed < 0 ? -distance_signed : distance_signed;
        int16_t delta_signed = (int16_t)phase - distance * 2;
        uint8_t delta = delta_signed < 0 ? -delta_signed : delta_signed;
        value = delta < 32 ? 255 - delta * 7 : 10;
    } else if (state == AG_ERROR) {
        value = ((timer_elapsed32(state_started) / 180) & 1) ? intensity : 0;
    } else if (value == 0) {
        value = 3;
    }
    RGB rgb = hsv_to_rgb((HSV){hue, saturation, value});
    *red = rgb.r; *green = rgb.g; *blue = rgb.b;
}
