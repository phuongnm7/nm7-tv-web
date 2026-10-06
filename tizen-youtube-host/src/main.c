#include <app.h>
#include <Elementary.h>
#include <Evas.h>
#include <ewk_context.h>
#include <ewk_intercept_request.h>
#include <ewk_view.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "nm7_adblock.h"

#define NM7_START_URL "https://nm7-tv-web.phuongnm7-iptv.workers.dev/"

typedef struct {
    Evas_Object *win;
    Evas_Object *view;
    Ewk_Context *context;
} nm7_app_t;

static void nm7_intercept_request_cb(
    Ewk_Context *context,
    Ewk_Intercept_Request *request,
    void *user_data)
{
    (void)context;
    (void)user_data;

    const char *url = ewk_intercept_request_url_get(request);

    if (url && nm7_should_block_url(url)) {
        /*
         * EWK explicitly documents that intercept callbacks are not on the UI
         * thread and that the request-specific EWK APIs below are safe here.
         */
        ewk_intercept_request_response_status_set(request, 204, "No Content");
        ewk_intercept_request_response_body_set(request, "", 0);
        return;
    }

    /*
     * Let WebKit handle normal requests.
     */
    ewk_intercept_request_ignore(request);
}

static const char *NM7_YOUTUBE_SKIP_JS =
"(function(){"
"'use strict';"
"if(window.__NM7_YT_SHIELD__)return;"
"window.__NM7_YT_SHIELD__=true;"
"function p(){"
"var s=['.ytp-ad-skip-button','.ytp-ad-skip-button-modern','.ytp-skip-ad-button'];"
"s.forEach(function(q){document.querySelectorAll(q).forEach(function(x){try{x.click()}catch(e){}})});"
"var c=document.querySelector('.ad-showing'),v=document.querySelector('video');"
"if(c&&v)try{if(isFinite(v.duration)&&v.duration>0&&v.currentTime+0.5<v.duration)v.currentTime=Math.max(0,v.duration-0.05)}catch(e){};"
"document.querySelectorAll('.ytp-ad-overlay-container,.ytp-ad-overlay-slot').forEach(function(x){try{x.remove()}catch(e){}});"
"}"
"try{new MutationObserver(p).observe(document.documentElement,{subtree:true,childList:true})}catch(e){}"
"setInterval(p,250);p();"
"})();";

static void nm7_load_finished_cb(void *data, Evas_Object *obj, void *event_info)
{
    (void)event_info;
    nm7_app_t *app = data;
    if (!app || !obj) return;

    /*
     * Inject after every navigation. youtube.com is top-level in this same
     * WebView, so the page script runs inside the YouTube document.
     */
    ewk_view_script_execute(obj, NM7_YOUTUBE_SKIP_JS, NULL, NULL);
}

static Eina_Bool nm7_create(void *data)
{
    nm7_app_t *app = data;

    app->win = elm_win_util_standard_add("NM7 TV", "NM7 TV");
    if (!app->win) return EINA_FALSE;

    evas_object_show(app->win);

    Evas *evas = evas_object_evas_get(app->win);
    app->context = ewk_context_default_get();
    app->view = ewk_view_add_with_context(evas, app->context);
    if (!app->view) return EINA_FALSE;

    evas_object_size_hint_weight_set(app->view, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
    elm_win_resize_object_add(app->win, app->view);

    ewk_context_intercept_request_callback_set(
        app->context,
        nm7_intercept_request_cb,
        app);

    ewk_view_smart_callback_add(
        app->view,
        "load,finished",
        nm7_load_finished_cb,
        app);

    evas_object_show(app->view);
    ewk_view_url_set(app->view, NM7_START_URL);

    return EINA_TRUE;
}

static void nm7_control(app_control_h control, void *data)
{
    (void)control;
    (void)data;
}

static void nm7_pause(void *data) { (void)data; }
static void nm7_resume(void *data) { (void)data; }

static void nm7_terminate(void *data)
{
    nm7_app_t *app = data;
    if (!app) return;
    if (app->view) evas_object_del(app->view);
    if (app->win) evas_object_del(app->win);
}

int main(int argc, char *argv[])
{
    (void)argc;
    (void)argv;

    nm7_app_t app = {0};
    ui_app_lifecycle_callback_s callbacks = {
        .create = nm7_create,
        .terminate = nm7_terminate,
        .control = nm7_control,
        .pause = nm7_pause,
        .resume = nm7_resume,
        .app_control = nm7_control,
    };

    return ui_app_main(argc, argv, &callbacks, &app);
}
