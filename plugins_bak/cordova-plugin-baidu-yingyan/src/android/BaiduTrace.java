package com.baidu.trace.plugin;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.util.Log;

import com.baidu.trace.LBSTraceClient;
import com.baidu.trace.api.track.OnTrackListener;
import com.baidu.trace.Trace;
//import com.baidu.trace.LocationMode;
import com.baidu.trace.model.StatusCodes;
import com.cordovaPlugin.JsonUtil;

import android.widget.Toast;

import java.util.Map;

//import static com.baidu.trace.LocationMode.Battery_Saving;
//import static com.baidu.trace.LocationMode.Device_Sensors;
//import static com.baidu.trace.LocationMode.High_Accuracy;

public class BaiduTrace extends CordovaPlugin {
    private LBSTraceClient client;
    private Trace trace;
    static String debugTag = "BaiduTrace";
    private Context ctx;

    private OnTraceListener mTraceListener = null;

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        // your init code here
        ctx = cordova.getActivity().getApplicationContext();
        //实例化轨迹服务客户端
        client = new LBSTraceClient(ctx);
    }

    private void setInterval(final JSONObject options, final CallbackContext callbackContext) {
        try {
            //鹰眼服务ID
            int gatherInterval = options.getInt("gatherInterval");
            //entity标识
            int packInterval = options.getInt("packInterval");
            client.setInterval(gatherInterval, packInterval);
            callbackContext.success();
        } catch (JSONException e) {
            Log.v(debugTag, "设置上传间隔失败");
            callbackContext.error(e.getMessage());
        }
    }

//    private void setLocationMode(final JSONObject options, final CallbackContext callbackContext) {
//        try {
//            LocationMode lm = High_Accuracy;
//            int mode = options.getInt("locationMode");
//            switch (mode) {
//                case 0:
//                    lm = High_Accuracy;
//                    break;
//                case 1:
//                    lm = Battery_Saving;
//                    break;
//                case 2:
//                    lm = Device_Sensors;
//            }
//            client.setLocationMode(lm);
//            callbackContext.success();
//
//        } catch (Exception e) {
//            Log.v(debugTag, "设置上传间隔失败");
//            callbackContext.error(e.getMessage());
//        }
//    }

    private void setProtocolType(final JSONObject options, final CallbackContext callbackContext) {
        try {
            int protocolType = options.getInt("protocolType");
            client.setProtocolType(protocolType);
            callbackContext.success();
        } catch (Exception e) {
            Log.v(debugTag, "设置协议失败");
            callbackContext.error(e.getMessage());
        }
    }

    private void initListener(){

        mTraceListener = new OnTraceListener() {
            @Override
            public void onBindServiceCallback(int i, String s) {
                Log.v(String.format("onBindServiceCallback, errorNo:%d, message:%s ", i, s));

            }

            /**
             * 开启服务回调接口
             * @param errorNo 状态码
             * @param message 消息
             *                <p>
             *                <pre>0：成功 </pre>
             *                <pre>10000：请求发送失败</pre>
             *                <pre>10001：服务开启失败</pre>
             *                <pre>10002：参数错误</pre>
             *                <pre>10003：网络连接失败</pre>
             *                <pre>10004：网络未开启</pre>
             *                <pre>10005：服务正在开启</pre>
             *                <pre>10006：服务已开启</pre>
             */
            @Override
            public void onStartTraceCallback(int errorNo, String message) {
                if (StatusCodes.SUCCESS == errorNo || StatusCodes.START_TRACE_NETWORK_CONNECT_FAILED <= errorNo) {
//                    trackApp.isTraceStarted = true;]
                    Log.v("StartTrace Success");
                    callbackContext.success();
                }else{
                    Log.v("StartTrace Fail");
                    callbackContext.error(message);
                }
            }

            /**
             * 停止服务回调接口
             * @param errorNo 状态码
             * @param message 消息
             *                <p>
             *                <pre>0：成功</pre>
             *                <pre>11000：请求发送失败</pre>
             *                <pre>11001：服务停止失败</pre>
             *                <pre>11002：服务未开启</pre>
             *                <pre>11003：服务正在停止</pre>
             */
            @Override
            public void onStopTraceCallback(int errorNo, String message) {
                if (StatusCodes.SUCCESS == errorNo || StatusCodes.CACHE_TRACK_NOT_UPLOAD == errorNo) {
                    Log.v("StartTrace Success");
                    callbackContext.success();
                }else{
                    Log.v("StartTrace Fail");
                    callbackContext.error(message);
                }
            }

            /**
             * 开启采集回调接口
             * @param errorNo 状态码
             * @param message 消息
             *                <p>
             *                <pre>0：成功</pre>
             *                <pre>12000：请求发送失败</pre>
             *                <pre>12001：采集开启失败</pre>
             *                <pre>12002：服务未开启</pre>
             */
            @Override
            public void onStartGatherCallback(int errorNo, String message) {
                if (StatusCodes.SUCCESS == errorNo || StatusCodes.GATHER_STARTED == errorNo) {
                    Log.v("StartTrace Success");
                    callbackContext.success();
                }else{
                    Log.v("StartTrace Fail");
                    callbackContext.error(message);
                }
            }

            /**
             * 停止采集回调接口
             * @param errorNo 状态码
             * @param message 消息
             *                <p>
             *                <pre>0：成功</pre>
             *                <pre>13000：请求发送失败</pre>
             *                <pre>13001：采集停止失败</pre>
             *                <pre>13002：服务未开启</pre>
             */
            @Override
            public void onStopGatherCallback(int errorNo, String message) {
                if (StatusCodes.SUCCESS == errorNo || StatusCodes.GATHER_STOPPED == errorNo) {
                    Log.v("StartTrace Success");
                    callbackContext.success();
                }else{
                    Log.v("StartTrace Fail");
                    callbackContext.error(message);
                }
            }

            /**
             * 推送消息回调接口
             *
             * @param messageType 状态码
             * @param pushMessage 消息
             *                  <p>
             *                  <pre>0x01：配置下发</pre>
             *                  <pre>0x02：语音消息</pre>
             *                  <pre>0x03：服务端围栏报警消息</pre>
             *                  <pre>0x04：本地围栏报警消息</pre>
             *                  <pre>0x05~0x40：系统预留</pre>
             *                  <pre>0x41~0xFF：开发者自定义</pre>
             */
            @Override
            public void onPushCallback(byte messageType, PushMessage pushMessage) {

            }
        };
    }

    private boolean startTrace(final JSONObject options, final CallbackContext callbackContext) {
        long serviceId;
        String entityName;
        int traceType;

        try {
            //鹰眼服务ID
            serviceId = options.getLong("serviceId"); //开发者创建的鹰眼服务ID
            //entity标识
            entityName = options.getString("entityName");

            //轨迹服务类型（0 : 不上传位置数据，也不接收报警信息； 1 : 不上传位置数据，但接收报警信息；2 : 上传位置数据，且接收报警信息）
//            traceType = options.getInt("operationMode");

        } catch (JSONException e) {
            Log.v(debugTag, "不存在参数");
            return false;
        }

        trace = new Trace(serviceId, entityName, traceType);
        //实例化轨迹服务

        client.startTrace(trace, mTraceListener);
        client.startGather(mTraceListener);

//        client.setOnTrackListener(new OnTrackListener() {
//            @Override
//            public void onRequestFailedCallback(String s) {
//                Log.v(debugTag, "请求失败, 请求查询历史?");
//            }
//
//            @Override
//            public Map onTrackAttrCallback() {
//                try {
//                    // 配置返回的自定义属性
//                    JSONObject customAttr = options.getJSONObject("customAttr");
//                    Log.v(debugTag, customAttr.toString());
//                    return JsonUtil.json2Map(customAttr);
//                } catch (JSONException e) {
//                    Log.v(debugTag, "customAttr 参数");
//                }
//                return super.onTrackAttrCallback();
//            }
//        });
//
//        //开启轨迹服务
//        client.startTrace(trace, new OnStartTraceListener() {
//            //开启轨迹服务回调接口（arg0 : 消息编码，arg1 : 消息内容，详情查看类参考）
//            @Override
//            public void onTraceCallback(int arg0, String arg1) {
//                // TODO Auto-generated method stub
//                if (0 == arg0 || 10006 == arg0 || 10008 == arg0) {
//                    callbackContext.success();
//                } else {
//                    callbackContext.error(arg1);
//                }
//            }
//
//            // 轨迹服务推送接口（用于接收服务端推送消息，arg0 : 消息类型，arg1 : 消息内容，详情查看类参考）
//            @Override
//            public void onTracePushCallback(byte arg0, String arg1) {
//                // TODO Auto-generated method stub
//                Log.v(debugTag, "轨迹服务推送,并未使用");
//            }
//        });



        return true;
    }

    private boolean stopTrace(final CallbackContext callbackContext) {
        if (client == null || trace == null) {
            return false;
        }

        //停止轨迹服务
        client.stopTrace(trace, mTraceListener);
        return true;
    }

    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        Log.i("leon", "插件调用");
        JSONObject options;

        try {
            options = args.getJSONObject(0);
            Log.v(debugTag, options.toString());
        } catch (JSONException e) {
            Log.v(debugTag, "options 未传入");
            return false;
        }

        if (action.equals("startTrace")) {
            startTrace(options, callbackContext);
            return true;
        } else if (action.equals("stopTrace")) {
            stopTrace(callbackContext);
            return true;
        } else if(action.equals("setInterval")){
            setInterval(options, callbackContext);
            return true;
        } else if (action.equals("setLocationMode")) {
//            setLocationMode(options, callbackContext);
            return true;
        } else if (action.equals("setProtocolType")) {
            setProtocolType(options, callbackContext);
            return true;
        }

        return false;
    }

    private void showMessage(final String message, final Integer errorNo) {
        Toast.makeText(cordova.getActivity().getApplicationContext(), message, Toast.LENGTH_LONG).show();
    }
}
