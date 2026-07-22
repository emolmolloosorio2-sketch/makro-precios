package com.valis.pos;

import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(PrinterPlugin.class);
    }

    @Override
    public void onResume() {
        super.onResume();
        View view = getBridge().getWebView();
        if (view instanceof WebView) {
            WebView wv = (WebView) view;
            wv.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void print(String html) {
                    runOnUiThread(() -> {
                        WebView printView = new WebView(MainActivity.this);
                        printView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageFinished(WebView view, String url) {
                                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                                pm.print("Recibo", view.createPrintDocumentAdapter("Recibo"),
                                        new PrintAttributes.Builder().build());
                            }
                        });
                        printView.loadDataWithBaseURL(null, html, "text/HTML", "UTF-8", null);
                    });
                }
            }, "AndroidPrinter");
        }
    }
}
