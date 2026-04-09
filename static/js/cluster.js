"use strict";
$(document).ready(function () {
    window.i18n = {
        locale: null,
        values: {},

        setTranslations: function (locale, values) {
            this.locale = locale;
            this.values = values || {};
        },

        t: function (key, fallback = '') {
            return this.values[key] ?? fallback ?? key;
        }
    };

    $.ajax({
        url: '/api/language',
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (response.status === 1 && response.data) {
                i18n.setTranslations(
                    response.data.code,
                    response.data.values
                );
            }
        },
        error: function () {
            console.error('Failed to load translations');
        }
    });

    $('.clusterRgbProfile').on('change', function () {
        const deviceId = $("#deviceId").val();
        const profile = $(this).val().split(";");
        if (profile.length < 2 || profile.length > 2) {
            toast.warning(i18n.t('txtInvalidProfileSelected'));
            return false;
        }

        const pf = {};
        pf["deviceId"] = deviceId;
        pf["channelId"] = parseInt(profile[0]);
        pf["profile"] = profile[1];

        const json = JSON.stringify(pf, null, 2);

        $.ajax({
            url: '/api/color',
            type: 'POST',
            data: json,
            cache: false,
            success: function(response) {
                try {
                    if (response.status === 1) {
                        location.reload();
                    } else {
                        toast.warning(response.message);
                    }
                } catch (err) {
                    toast.warning(response.message);
                }
            }
        });
    });

    function getSwitchProfilesInOrder() {
        const values = [];
        $('#clusterSwitchProfiles option').each(function () {
            const value = ($(this).val() || '').trim();
            if (value.length > 0) {
                values.push(value);
            }
        });
        return values;
    }

    function appendSwitchProfile(profileName) {
        if (!profileName || profileName.length < 1) {
            return;
        }
        const existing = getSwitchProfilesInOrder();
        if (existing.includes(profileName)) {
            return;
        }
        $('#clusterSwitchProfiles').append(
            $('<option>', { value: profileName, text: profileName })
        );
    }

    // Initialize switch-profile list from server-provided values.
    $('.clusterSwitchProfileCurrent').each(function () {
        const value = ($(this).val() || '').trim();
        appendSwitchProfile(value);
    });

    $('#addClusterSwitchProfile').on('click', function () {
        const profileName = ($('#clusterSwitchAddProfile').val() || '').trim();
        if (profileName.length < 1) {
            return false;
        }
        appendSwitchProfile(profileName);
        return false;
    });

    $('#removeClusterSwitchProfile').on('click', function () {
        $('#clusterSwitchProfiles option:selected').remove();
        return false;
    });

    $('#moveUpClusterSwitchProfile').on('click', function () {
        const selected = $('#clusterSwitchProfiles option:selected');
        selected.each(function () {
            const prev = $(this).prev();
            if (prev.length > 0) {
                $(this).insertBefore(prev);
            }
        });
        return false;
    });

    $('#moveDownClusterSwitchProfile').on('click', function () {
        const selected = $($('#clusterSwitchProfiles option:selected').get().reverse());
        selected.each(function () {
            const next = $(this).next();
            if (next.length > 0) {
                $(this).insertAfter(next);
            }
        });
        return false;
    });

    $('#saveClusterSwitchProfiles').on('click', function () {
        const deviceId = $("#deviceId").val();
        const profiles = getSwitchProfilesInOrder();

        if (profiles.length < 2) {
            toast.warning(i18n.t('txtInvalidProfileSelected', 'Select at least 2 profiles'));
            return false;
        }

        const pf = {
            deviceId: deviceId,
            profiles: profiles
        };

        $.ajax({
            url: '/api/cluster/switchProfiles',
            type: 'POST',
            data: JSON.stringify(pf, null, 2),
            cache: false,
            success: function(response) {
                try {
                    if (response.status === 1) {
                        toast.success(response.message);
                        location.reload();
                    } else {
                        toast.warning(response.message);
                    }
                } catch (err) {
                    toast.warning(response.message);
                }
            }
        });
    });

    $('#brightnessSlider').on('change', function () {
        const deviceId = $("#deviceId").val();
        const brightness = $(this).val();
        const brightnessValue = parseInt(brightness);

        if (brightnessValue < 0 || brightnessValue > 100) {
            toast.warning(i18n.t('txtInvalidBrightness'));
            return false;
        }

        const pf = {};
        pf["deviceId"] = deviceId;
        pf["brightness"] = brightnessValue;

        const json = JSON.stringify(pf, null, 2);

        $.ajax({
            url: '/api/brightness/gradual',
            type: 'POST',
            data: json,
            cache: false,
            success: function(response) {
                try {
                    if (response.status === 1) {
                        toast.success(response.message);
                    } else {
                        toast.warning(response.message);
                    }
                } catch (err) {
                    toast.warning(response.message);
                }
            }
        });
    });

    const $brightnessSlider = $("#brightnessSlider");
    const $brightnessSliderValue = $("#brightnessSliderValue");
    function updateSlider() {
        const min = Number($brightnessSlider.attr("min"));
        const max = Number($brightnessSlider.attr("max"));
        const value = Number($brightnessSlider.val());

        const percent = ((value - min) / (max - min)) * 100;

        $brightnessSlider.css("--slider-progress", percent + "%");
        $brightnessSliderValue.text(value + " %");
    }

    if ($brightnessSlider.length) {
        $brightnessSlider.on("input", updateSlider);
        updateSlider();
    }
});
