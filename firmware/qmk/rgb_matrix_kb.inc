// SPDX-License-Identifier: MIT
RGB_MATRIX_EFFECT(agentglow)

#ifdef RGB_MATRIX_CUSTOM_EFFECT_IMPLS
void agentglow_color(uint8_t index, uint8_t *red, uint8_t *green, uint8_t *blue);

static bool agentglow(effect_params_t *params) {
    RGB_MATRIX_USE_LIMITS(led_min, led_max);
    for (uint8_t i = led_min; i < led_max; i++) {
        uint8_t r, g, b;
        agentglow_color(i, &r, &g, &b);
        rgb_matrix_set_color(i, r, g, b);
    }
    return rgb_matrix_check_finished_leds(led_max);
}
#endif
