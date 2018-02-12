Chart.pluginService.register({
    beforeDraw: function(chart) {
        if (chart.config.options.plugin_attribute == 'gauge_with_text') {
            var width = chart.chart.width,
                height = chart.chart.height,
                ctx = chart.chart.ctx;

            ctx.restore();
            var fontSize = (height/9).toFixed(2);
            ctx.font = fontSize + "pt Helvetica";
            ctx.fillStyle = chart.config.options.textColor;
            ctx.textBaseline = "middle";
            
            var text = chart.config.options.text,
                textX = Math.round((width - ctx.measureText(text).width) / 2),
                textY = height*2 / 3 ;

            ctx.fillText(text, textX, textY);
            ctx.save();
        }
    }
});