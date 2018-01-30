<template lang="pug">
    b-card(v-bind:style="'background-color:'+background")
        .card-body.pb-0
            video.responsive(ref="video" loop="true" src="/static/clips/blank.mp4" muted)
</template>


<script>
import Vue from 'vue';
import Kuzzle from 'kuzzle-sdk';
import { EventBus } from '../../event-bus.js';
import config from '../../config/config.json';

export default {
    name: 'IotVideo',
    data() {
        var currentScene = false,
            eventHandlers = {},
            background= "#FFF";

        return {
            currentScene: currentScene,
            eventHandlers: eventHandlers,
            background: background
        }
    },
    mounted: function() {
        var self= this;

        this.$nextTick(function() {
            self.eventHandlers = {
                playscene: self.playScene,
                videoBackgroundColor: self.videoBackgroundColor
            }

            // Register Events
            for (var key in self.eventHandlers) {
              EventBus.$on(key, self.eventHandlers[key]);
            }


            self.$refs.video.addEventListener('ended',() => {
                var clip = config.clips[self.currentScene];
                if (clip.play_next) {
                    EventBus.$emit('playscene',clip.play_next);
                }
            })
            
        });
    },
    methods : {
        playScene(scene) {
            var self=this;
            self.currentScene = scene;
            var clip = config.clips[scene];
            //Change video tag
            self.$refs.video.pause();
            if (clip.file) self.$refs.video.src = '/static/clips/'+clip.file;
            self.$refs.video.loop = clip.loop?true:false;
            self.$refs.video.play();
        },
        videoBackgroundColor(color) {
            var self=this;
            self.background = color;
            if (color!="#FFF") setTimeout(function(){self.videoBackgroundColor("#FFF")},1000);
        }
    },
    destroyed: function(){
        var self = this;
        //remove event listener
        /*$.each(self.eventHandlers, (key,handler) => {
            EventBus.$off(key, handler);
        });*/
    }
}

</script>