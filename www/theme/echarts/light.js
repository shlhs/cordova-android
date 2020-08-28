var contrastColor = '#77A1D1';
var axisCommon = function() {
    return {
        axisLine: {
            lineStyle: {
                color: contrastColor
            }
        },
        axisTick: {
            lineStyle: {
                color: contrastColor
            }
        },
        axisLabel: {
            textStyle: {
                color: contrastColor
            }
        },
        splitLine: {
            lineStyle: {
                type: 'dashed',
                color: '#13377B'
            }
        },
        splitArea: {
            areaStyle: {
                color: contrastColor
            }
        }
    };
};

var colorPalette = [
    '#304E86',
    '#FE8061',
    '#7986CB',
    '#4CA2FF',
    '#E4E4E4',
    '#66BB6A',
    '#41BED8',
    '#20DBD5',
    '#5B81ED',
    '#F2E152',
    '#F54C5E'
];

var echartThemeConfig = {
    color: colorPalette,
    tooltip: {
        axisPointer: {
            lineStyle: {
                color: contrastColor
            },
            crossStyle: {
                color: contrastColor
            },
            label: {
                color: '#000'
            }
        }
    },
    legend: {
        textStyle: {
            color: contrastColor,
            fontSize: 13,
        }
    },
    title: {
        textStyle: {
            color: contrastColor,
            fontSize: 16,
        }
    },
    toolbox: {
        iconStyle: {
            normal: {
                borderColor: contrastColor
            }
        }
    },

    // Area scaling controller
    dataZoom: {
        dataBackgroundColor: '#eee', // Data background color
        fillerColor: 'rgba(200,200,200,0.2)', // Fill the color
        handleColor: '#dd6b66' // Handle color
    },

    timeline: {
        itemStyle: {
            color: contrastColor
        },
        lineStyle: {
            color: contrastColor
        },
        controlStyle: {
            color: contrastColor,
            borderColor: contrastColor
        },
        label: {
            color: contrastColor
        }
    },

    timeAxis: axisCommon(),
    logAxis: axisCommon(),
    valueAxis: axisCommon(),
    categoryAxis: axisCommon(),

    line: {
        symbol: 'circle'
    },
    graph: {
        color: colorPalette
    },

    gauge: {
        axisLine: {
            lineStyle: {
                color: [
                    [0.2, '#dd6b66'],
                    [0.8, '#759aa0'],
                    [1, '#ea7e53']
                ],
                width: 8
            }
        },
        title: {
            color: contrastColor
        },
    },

    candlestick: {
        itemStyle: {
            color: '#FD1050',
            color0: '#0CF49B',
            borderColor: '#FD1050',
            borderColor0: '#0CF49B'
        }
    },
    radar:{

        splitArea: {
            areaStyle: {
                color: ['#23313F','#1B2834',],
            }
        },
        axisLine: {
            lineStyle: {
                color: contrastColor
            }
        },
        splitLine: {
            lineStyle: {
                color: '#7790A5'
            }
        },
    },
};

echarts.registerTheme('custom', echartThemeConfig);