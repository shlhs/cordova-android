var contrastColor = 'rgba(255, 255, 255, 0.5)';
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
            },
            show: false,
        },
        axisLabel: {
            textStyle: {
                color: contrastColor
            }
        },
        splitLine: {
            lineStyle: {
                type: 'dashed',
                color: 'rgba(255, 255, 255, 0.15)'
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
    '#41bed8',
    '#fde664',
    '#9283ea',
    '#3cd3cb',
    '#fe7979',
    '#f9b344',
    '#46be8a',
    '#579fe4',
    '#f37c54',
    '#3995ea'
];
var g_pvf_label = {
    p: '峰',
    f: '平',
    v: '谷',
    s: '尖'
};
var g_pvf_colors = {
    'p': 'rgba(239, 150, 166, 1)',
    'v': 'rgba(138, 212, 199, 1)',
    'f': 'rgba(136, 169, 248, 1)',
    's': 'rgba(254,139,106, 1)',
};
var g_pvf_label_colors = {
    'p': 'rgba(239, 150, 166, 1)',
    'v': 'rgba(138, 212, 199, 1)',
    'f': 'rgba(136, 169, 248, 1)',
    's': 'rgba(254,139,106, 1)',
};

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
                color: '#FEFEFE'
            }
        }
    },
    legend: {
        textStyle: {
            color: contrastColor,
            fontSize: 13,
        },
        inactiveColor: '#FEFEFE'
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
                color: '#7790A5'
            }
        },
        splitLine: {
            lineStyle: {
                color: '#7790A5'
            }
        },
    },
};

echarts.registerTheme('custom', echartThemeConfig); // dark和light都设置主题色为custom，用gulp根据主题色将不同文件拷贝到index.js，html中引用index.js