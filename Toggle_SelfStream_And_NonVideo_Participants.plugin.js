/**
 * @name Toggle_SelfStream_And_NonVideo_Participants
 * @description Toggles the visibility of the self-stream and non-video participants in Discord's video call settings. It also re-applies the hidden state when changing voice channels.
 * @version 2.1.0
 * @author Uneducated-Engineer
 */

module.exports = class Toggle_SelfStream_And_NonVideo_Participants {
    constructor() {
        this.intervalId = null; // Store the interval ID for cleanup
        this.streamHidden = false; // Track whether the self-stream is hidden
        this.lastChannelId = null; // Track the last active voice channel ID
    }

    start() {
        console.log("Toggle_SelfStream_And_NonVideo_Participants Plugin Started.");
        this.intervalId = setInterval(() => {
            this.toggleVisibility();
        }, 1000); // Interval set to 1 second
    }

    // Method to locate the stream module
    getStreamModule() {
        try {
            const streamModule = BdApi.findModuleByProps("getCurrentUserActiveStream", "isSelfStreamHidden");
            console.log("Stream module found:", streamModule);
            return streamModule;
        } catch (error) {
            console.error("Error while accessing stream module:", error);
            return null;
        }
    }

    // Dispatch visibility event to hide the self-stream
    dispatchVisibilityEvent(channelId, isHidden) {
        try {
            const dispatchModule = BdApi.findModuleByProps('dispatch');
            dispatchModule.dispatch({
                type: "STREAM_UPDATE_SELF_HIDDEN",
                channelId: channelId,
                selfStreamHidden: isHidden
            });
            console.log(`Dispatched self-stream visibility event: ${isHidden ? 'Hidden' : 'Visible'}`);
            this.streamHidden = isHidden; // Track the hidden state
        } catch (error) {
            console.error("Error while dispatching visibility event:", error);
        }
    }

    // Get the active voice channel ID for non-video participants
    getActiveChannelId() {
        try {
            const voiceStateStore = BdApi.Webpack.getStore('VoiceStateStore');
            const userStore = BdApi.Webpack.getStore('UserStore');
            const currentUser = userStore.getCurrentUser();

            if (voiceStateStore && currentUser) {
                const voiceState = voiceStateStore.getVoiceStateForUser(currentUser.id);
                if (voiceState && voiceState.channelId) {
                    console.log(`Active Voice Channel ID: ${voiceState.channelId}`);
                    return voiceState.channelId;
                } else {
                    console.log("No active voice channel found.");
                    return null;
                }
            } else {
                console.log("Error: VoiceStateStore or CurrentUser is undefined.");
                return null;
            }
        } catch (error) {
            console.error("Error retrieving active voice channel:", error);
            return null;
        }
    }

    // Find the toggleVoiceParticipantsHidden function
    findToggleFunction() {
        try {
            const modules = BdApi.findAllModules(m => m.toggleVoiceParticipantsHidden);
            if (modules && modules.length > 0) {
                console.log("toggleVoiceParticipantsHidden function found.");
                return modules[0].toggleVoiceParticipantsHidden;
            } else {
                console.log("toggleVoiceParticipantsHidden function not found.");
            }
        } catch (error) {
            console.error("Error finding toggleVoiceParticipantsHidden function:", error);
        }
        return null;
    }

    // Toggle the visibility of non-video participants
    toggleNonVideoParticipants(channelId) {
        const toggleVoiceParticipantsHidden = this.findToggleFunction();
        if (toggleVoiceParticipantsHidden) {
            try {
                console.log(`Toggling 'Show Non-Video Participants' for channel: ${channelId}`);
                toggleVoiceParticipantsHidden(channelId, true);  // Hide non-video participants
                console.log("Successfully toggled non-video participants.");
            } catch (error) {
                console.error("Error toggling non-video participants:", error);
            }
        } else {
            console.log("toggleVoiceParticipantsHidden function not found.");
        }
    }

    // Test and toggle both self-stream and non-video participants visibility
    toggleVisibility() {
        try {
            console.log("Attempting to toggle self-stream and non-video participants visibility...");

            // Handle voice channel change
            const activeChannelId = this.getActiveChannelId();
            if (activeChannelId && activeChannelId !== this.lastChannelId) {
                console.log("Voice channel changed, resetting streamHidden state.");
                this.streamHidden = false; // Reset hidden state when changing channels
                this.lastChannelId = activeChannelId; // Update last channel ID
            }

            // Handle self-stream visibility
            try {
                const allActiveStreams = BdApi.findModuleByProps("getAllActiveStreams").getAllActiveStreams();
                const currentUserId = BdApi.findModuleByProps("getCurrentUser").getCurrentUser().id;

                console.log("All active streams:", allActiveStreams); // Log active streams

                const selfStream = allActiveStreams.find(stream => stream.ownerId === currentUserId);
                console.log("Self-stream:", selfStream); // Log the self-stream if found

                if (selfStream) {
                    console.log("Self-stream found, checking visibility...");
                    const visibilityModule = this.getStreamModule();

                    if (visibilityModule) {
                        if (this.streamHidden) {
                            console.log("Stream is already hidden, no further action.");
                        } else {
                            console.log("Hiding the self-stream...");
                            this.dispatchVisibilityEvent(selfStream.channelId, true); // Hide the stream
                        }
                    } else {
                        console.log("Stream module is not found.");
                    }
                } else {
                    console.log("Self-stream not found.");
                }
            } catch (error) {
                console.error("Error hiding self-stream:", error);
            }

            // Handle non-video participants visibility
            if (activeChannelId) {
                this.toggleNonVideoParticipants(activeChannelId); // Toggle non-video participants
            } else {
                console.log("No active voice channel found for non-video participants.");
            }

        } catch (error) {
            console.error("General error while toggling visibility:", error);
        }
    }

    stop() {
        console.log("Toggle_SelfStream_And_NonVideo_Participants Plugin Stopped.");
        if (this.intervalId) {
            clearInterval(this.intervalId); // Stop the interval when the plugin is stopped
        }
    }
};
