"use strict";
$(document).ready(function () {
    const $clusterRgbProfile = $('#clusterRgbProfile');
    const $clusterRgbCells = $('.cluster-rgb-cell');
    const clusterSyncIntervalMs = 400;
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

    function syncClusterRgbDisplay(profileName) {
        if (!profileName || profileName.length < 1) {
            return;
        }

        const rgbOption = '0;' + profileName;
        if ($clusterRgbProfile.find('option[value="' + rgbOption + '"]').length > 0) {
            $clusterRgbProfile.val(rgbOption);
        }

        $clusterRgbCells.text(profileName);

        // Keep the switch-profile selection visually aligned with the active RGB
        // profile, but do not disturb the user while reordering items.
        if (!dragState && selectedSwitchProfile !== profileName) {
            selectSwitchProfile(profileName);
        }
    }

    function syncClusterStateFromApi() {
        $.ajax({
            url: '/api/devices/cluster',
            method: 'GET',
            cache: false,
            success: function (response) {
                try {
                    const profileName = response.device.DeviceProfile.RGBProfile;
                    if (profileName && profileName.length > 0) {
                        syncClusterRgbDisplay(profileName);
                    }
                } catch (err) {
                    console.error('Failed to sync cluster state');
                }
            },
            error: function () {
                console.error('Failed to fetch cluster state');
            }
        });
    }

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
        syncClusterRgbDisplay(profile[1]);

        $.ajax({
            url: '/api/color',
            type: 'POST',
            data: json,
            cache: false,
            success: function(response) {
                try {
                    if (response.status === 1) {
                        syncClusterRgbDisplay(profile[1]);
                    } else {
                        toast.warning(response.message);
                        syncClusterStateFromApi();
                    }
                } catch (err) {
                    toast.warning(response.message);
                    syncClusterStateFromApi();
                }
            },
            error: function () {
                syncClusterStateFromApi();
            }
        });
    });

    const $clusterSwitchProfiles = $('#clusterSwitchProfiles');
    let selectedSwitchProfile = '';
    let suppressSwitchApplyUntil = 0;
    let dragState = null;

    function getSwitchProfilesInOrder() {
        const values = [];
        $clusterSwitchProfiles.find('.cluster-switch-item').each(function () {
            const value = ($(this).data('profile') || '').toString().trim();
            if (value.length > 0) {
                values.push(value);
            }
        });
        return values;
    }

    function renderSwitchProfiles() {
        const profiles = getSwitchProfilesInOrder();
        $clusterSwitchProfiles.empty();

        profiles.forEach(function (profileName) {
            const $item = $('<div>', {
                class: 'cluster-switch-item' + (profileName === selectedSwitchProfile ? ' selected' : ''),
                'data-profile': profileName,
                tabindex: 0,
                role: 'option',
                'aria-selected': profileName === selectedSwitchProfile ? 'true' : 'false'
            });

            $item.append($('<span>', {
                class: 'cluster-switch-item-label',
                text: profileName
            }));

            $item.append($('<span>', {
                class: 'cluster-switch-item-grip',
                text: ':::'
            }));

            $clusterSwitchProfiles.append($item);
        });
    }

    function appendSwitchProfile(profileName) {
        if (!profileName || profileName.length < 1) {
            return;
        }
        const existing = getSwitchProfilesInOrder();
        if (existing.includes(profileName)) {
            return;
        }
        $clusterSwitchProfiles.append(
            $('<div>', {
                class: 'cluster-switch-item',
                'data-profile': profileName,
                tabindex: 0,
                role: 'option',
                'aria-selected': 'false'
            }).append(
                $('<span>', { class: 'cluster-switch-item-label', text: profileName }),
                $('<span>', { class: 'cluster-switch-item-grip', text: ':::' })
            )
        );
    }

    function selectSwitchProfile(profileName) {
        selectedSwitchProfile = profileName || '';
        renderSwitchProfiles();
    }

    function moveSwitchProfile(profileName, targetName, placeAfter) {
        const profiles = getSwitchProfilesInOrder();
        const original = profiles.slice();
        const fromIndex = profiles.indexOf(profileName);
        const targetIndex = profiles.indexOf(targetName);

        if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
            return false;
        }

        profiles.splice(fromIndex, 1);
        let insertIndex = targetIndex;
        if (fromIndex < targetIndex) {
            insertIndex -= 1;
        }
        if (placeAfter) {
            insertIndex += 1;
        }
        profiles.splice(insertIndex, 0, profileName);

        if (JSON.stringify(profiles) === JSON.stringify(original)) {
            return false;
        }

        $clusterSwitchProfiles.empty();
        profiles.forEach(function (name) {
            appendSwitchProfile(name);
        });
        renderSwitchProfiles();
        return true;
    }

    function clearDropIndicators() {
        $clusterSwitchProfiles.find('.cluster-switch-item')
            .removeClass('drop-before drop-after dragging');
    }

    function applySwitchProfile(profileName) {
        const deviceId = $("#deviceId").val();
        const payload = {
            deviceId: deviceId,
            channelId: 0,
            profile: profileName
        };

        syncClusterRgbDisplay(profileName);

        $.ajax({
            url: '/api/color',
            type: 'POST',
            data: JSON.stringify(payload, null, 2),
            cache: false,
            success: function(response) {
                try {
                    if (response.status === 1) {
                        syncClusterRgbDisplay(profileName);
                    } else {
                        toast.warning(response.message);
                        syncClusterStateFromApi();
                    }
                } catch (err) {
                    toast.warning(response.message);
                    syncClusterStateFromApi();
                }
            },
            error: function () {
                syncClusterStateFromApi();
            }
        });
    }

    // Initialize switch-profile list from server-provided values.
    $('.clusterSwitchProfileCurrent').each(function () {
        const value = ($(this).val() || '').trim();
        appendSwitchProfile(value);
    });

    // Backward-compatible fallback for old profiles with empty switch list.
    if (getSwitchProfilesInOrder().length === 0) {
        const selected = ($('#clusterRgbProfile').val() || '').split(';');
        const currentProfile = selected.length === 2 ? selected[1] : '';
        [currentProfile, 'static', 'off'].forEach(appendSwitchProfile);
    }

    const currentRgbProfile = (($('#clusterRgbProfile').val() || '').split(';'))[1] || '';
    selectedSwitchProfile = currentRgbProfile;
    renderSwitchProfiles();

    $('#addClusterSwitchProfile').on('click', function () {
        const profileName = ($('#clusterSwitchAddProfile').val() || '').trim();
        if (profileName.length < 1) {
            return false;
        }
        appendSwitchProfile(profileName);
        selectSwitchProfile(profileName);
        return false;
    });

    $('#removeClusterSwitchProfile').on('click', function () {
        if (!selectedSwitchProfile) {
            return false;
        }

        $clusterSwitchProfiles.find('.cluster-switch-item').each(function () {
            if (($(this).data('profile') || '').toString() === selectedSwitchProfile) {
                $(this).remove();
            }
        });

        const remainingProfiles = getSwitchProfilesInOrder();
        selectedSwitchProfile = remainingProfiles.length > 0 ? remainingProfiles[0] : '';
        renderSwitchProfiles();
        return false;
    });

    $clusterSwitchProfiles.on('click', '.cluster-switch-item', function () {
        const profileName = ($(this).data('profile') || '').toString();
        if (!profileName) {
            return false;
        }

        selectSwitchProfile(profileName);
        if (Date.now() < suppressSwitchApplyUntil) {
            return false;
        }
        applySwitchProfile(profileName);
        return false;
    });

    $clusterSwitchProfiles.on('mousedown', '.cluster-switch-item', function (event) {
        if (event.which !== 1) {
            return;
        }

        const profileName = ($(this).data('profile') || '').toString();
        if (!profileName) {
            return;
        }

        dragState = {
            profileName: profileName,
            startX: event.clientX,
            startY: event.clientY,
            moved: false
        };

        $(this).addClass('dragging');
        $('body').addClass('cluster-switch-dragging');
        event.preventDefault();
    });

    $(document).on('mousemove', function (event) {
        if (!dragState) {
            return;
        }

        const travelX = Math.abs(event.clientX - dragState.startX);
        const travelY = Math.abs(event.clientY - dragState.startY);
        if (!dragState.moved && (travelX + travelY) < 6) {
            return;
        }

        dragState.moved = true;
        suppressSwitchApplyUntil = Date.now() + 500;

        const targetNode = document.elementFromPoint(event.clientX, event.clientY);
        if (!targetNode) {
            return;
        }

        const $targetItem = $(targetNode).closest('.cluster-switch-item');
        if ($targetItem.length === 0) {
            return;
        }

        const targetProfile = ($targetItem.data('profile') || '').toString();
        if (!targetProfile || targetProfile === dragState.profileName) {
            return;
        }

        clearDropIndicators();
        const rect = $targetItem.get(0).getBoundingClientRect();
        const placeAfter = (event.clientY - rect.top) > (rect.height / 2);
        $targetItem.addClass(placeAfter ? 'drop-after' : 'drop-before');

        if (moveSwitchProfile(dragState.profileName, targetProfile, placeAfter)) {
            $clusterSwitchProfiles.find('.cluster-switch-item').each(function () {
                if (($(this).data('profile') || '').toString() === dragState.profileName) {
                    $(this).addClass('dragging');
                }
            });
        }
    });

    $(document).on('mouseup', function () {
        if (!dragState) {
            return;
        }

        clearDropIndicators();
        $('body').removeClass('cluster-switch-dragging');
        dragState = null;
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

    syncClusterStateFromApi();
    setInterval(syncClusterStateFromApi, clusterSyncIntervalMs);
});
