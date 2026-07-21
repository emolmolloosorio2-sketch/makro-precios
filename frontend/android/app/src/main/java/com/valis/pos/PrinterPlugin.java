package com.valis.pos;

import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintDocumentInfo;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.FileInputStream;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {

    @PluginMethod
    public void print(final PluginCall call) {
        String html = call.getString("html", "");
        String title = call.getString("title", "Recibo");

        getBridge().getActivity().runOnUiThread(() -> {
            WebView webView = new WebView(getBridge().getContext());
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    PrintManager printManager = (PrintManager) getBridge().getContext()
                            .getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(title);
                    printManager.print(title, adapter, new PrintAttributes.Builder().build());
                    call.resolve();
                }
            });
            webView.loadDataWithBaseURL(null, html, "text/HTML", "UTF-8", null);
        });
    }
}
