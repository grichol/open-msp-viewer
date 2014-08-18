var GantTChart;

(function(){

var resolutionMillis = {
  "year": 366 * 24 * 60 * 60 * 1000,
  "month": 31 * 24 * 60 * 60 * 1000,
  "week":   7 * 24 * 60 * 60 * 1000,
  "day":    1 * 24 * 60 * 60 * 1000
};

cEl("div", {
  id: "_scrollbars1",
  style: {
    "background-color": "blue",
    position: "absolute",
    overflow: "auto",
    width: "50px",
    height: "50px",
    left: "-50px",
    top: "-50px"
  }
}, cEl("div", {
  id: "_scrollbars2",
  style: {
    "background-color": "red",
    position: "absolute",
    left: "0px",
    top: "0px",
    width: "100px",
    height: "100px"
  }
}), body);
var _scrollbars1 = gEl("_scrollbars1");
var scrollbarWidth = (_scrollbars1.offsetWidth - _scrollbars1.clientWidth) + 2;
var scrollbarHeight = (_scrollbars1.offsetHeight - _scrollbars1.clientHeight) + 2;

(GantTChartComponent = function(conf){
  ContentPane.call(this, conf);
}).prototype = {
  setGantTChart: function(gantTChart){
    this.gantTChart = gantTChart;
  },
  getGantTChart: function(){
    return this.gantTChart;
  },
  getTaskClassName: function(task) {
    var className = "task";
    className += " task-Type" + task.Type;
    className += " task-IsNull" + task.IsNull;
    className += " task-ResumeValid" + task.ResumeValid;
    className += " task-EffortDriven" + task.EffortDriven;
    className += " task-Recurring" + task.Recurring;
    className += " task-OverAllocated" + task.OverAllocated;
    className += " task-Estimated" + task.Estimated;
    className += " task-Milestone" + task.Milestone;
    className += " task-Summary" + task.Summary;
    className += " task-Critical" + task.Critical;
    className += " task-IsSubproject" + task.IsSubproject;
    className += " task-IsSubprojectReadOnly" + task.IsSubprojectReadOnly;
    className += " task-ExternalTask" + task.ExternalTask;
    className += " task-LevelAssignments" + task.LevelAssignments;
    className += " task-LevelingCanSplit" + task.LevelingCanSplit;
    className += " task-IgnoreResourceCalendar" + task.IgnoreResourceCalendar;
    className += " task-HideBar" + task.HideBar;
    className += " task-Rollup" + task.Rollup;
    className += " task-IsPublished" + (task.IsPublished || "");
    return className;
  }
};
adopt(GantTChartComponent, ContentPane);

(GantTCalendarPane = function(conf){
  if (!conf) conf = {};
  if (!conf.classes) conf.classes = [];
  conf.classes = conf.classes.concat([
    "contentpane-noselect",
    GantTChart.prefix + "-contentpane",
    GantTChart.prefix + "-calendarpane"
  ]);
  GantTChartComponent.call(this, conf);
}).prototype = {
  createHeaderDom: function(el) {
    this.header = cEl("div", {
      "class": GantTChart.prefix + "-calendarpane-header"
    }, null, el);
  },
  createBodyDom: function(el) {
    this.bodyTable = cEl("table", {
      "class": GantTChart.prefix + "-calendarpane-body-table",
      cellpadding: 0,
      cellspacing: 0
    });
    this.body = cEl("div", {
      "class": GantTChart.prefix + "-calendarpane-body",
      style: {
        "border-bottom-width": scrollbarHeight + "px",
        "overflow-x": this.getCalendarResolution() === "project" ? "hidden" : "auto"
      }
    }, this.bodyTable, el);
    listen(this.body, "scroll", this.scrollHandler, this)
  },
  createDom: function(){
    var el = ContentPane.prototype.createDom.call(this);
    this.createHeaderDom(el);
    this.createBodyDom(el);
    return el;
  },
  scrollHandler: function(event){
    var target = event.getTarget();
    var gantTChart = this.getGantTChart();
    gantTChart.scrolled(target.scrollLeft, target.scrollTop);
  },
  scroll: function(scrollLeft, scrollTop){
    var header = this.getHeader();
    header.style.left = (-scrollLeft) + "px";
  },
  renderTasks: function(){
    var gantTChart = this.getGantTChart();
    var mspDocument = gantTChart.getDocument();
    if (!mspDocument) return;
    var clientWidth = this.getDom().offsetWidth - scrollbarWidth;
    var dontSuppressProjectSummaryTask = gantTChart.dontSuppressProjectSummaryTask();
    var projectDatesAndDimensions = this.getProjectDatesAndDimensions();

    var body = this.getBody();
    var bodyTable = this.getBodyTable();
    if (!bodyTable) return;
    var rows = bodyTable.rows;
    var rowIndex = 0;

    mspDocument.forEachTask(function(task, index){
      if (index === 0 && !dontSuppressProjectSummaryTask) return;
      var row = rows[rowIndex++];
      var cell = row.cells[0];
      var taskDiv = cell.firstChild;

      if (task.IsNull === "1") {
        taskDiv.style.width = 0 + "px";
        return;
      }

      var taskStart = mspDocument.parseDate(task.Start);
      var taskFinish = mspDocument.parseDate(task.Finish);
      var diff, w, l, style = taskDiv.style;
      diff = taskStart - projectDatesAndDimensions.startTime;
      l = parseInt(projectDatesAndDimensions.width / projectDatesAndDimensions.screenMillis * diff, 10);
      diff = taskFinish - projectDatesAndDimensions.startTime;
      w = parseInt(projectDatesAndDimensions.width / projectDatesAndDimensions.screenMillis * diff, 10);
      style.left = l + "px";
      style.width = (task.IsNull === "1" ? 0 : (w-l)) + "px";

      var links = task.PredecessorLink, from, to, linkType, aboveBelow, leftRight;
      var posRow = pos(row, body), posPredecessorRow;
      if (!links) {
        return;
      }
      else
      if (!iArr(links)){
        links = [links];
      }
      var link, n = links.length, predecessorRow, i, linkEl, linkId;
      for (i = 0; i < n; i++){
        link = links[i];
        linkType = parseInt(link.Type, 10);
        predecessorRow = gEl("calendarpane-row-" + link.PredecessorUID);

        //is task below or above its predecessor?
        aboveBelow = row.rowIndex > predecessorRow.rowIndex ? "below" : "above";

        if (!predecessorRow) {
          console.log("Whoops, predecessor not found.");
          continue;
        }
        posPredecessorRow = pos(predecessorRow, body);
        linkId = "link-task-" + task.UID + "-predecessor-task-" + link.PredecessorUID;
        linkEl = gEl(linkId);
        var isNew = false;
        if (!linkEl) {
          isNew = true;
          linkEl = cEl("div", {
            id: linkId,
            "class": "task-predecessor-link" +
                     " task-predecessor-link-type" + linkType
          }, [
            cEl("div", {
              id: linkId + "-segment1",
              "class": "task-predecessor-link-segment" +
                        " task-predecessor-link-segment1"
            }),
            cEl("div", {
              id: linkId + "-segment2",
              "class": "task-predecessor-link-segment" +
                        " task-predecessor-link-segment2"
            }),
            cEl("div", {
              id: linkId + "-segment3",
              "class": "task-predecessor-link-segment" +
                        " task-predecessor-link-segment3"
            }),
            cEl("div", {
              id: linkId + "-segment4",
              "class": "task-predecessor-link-segment" +
                        " task-predecessor-link-segment4"
            }),
            cEl("div", {
              id: linkId + "-segment5",
              "class": "task-predecessor-link-segment" +
                        " task-predecessor-link-segment5"
            })
          ], body);
        }
        switch (linkType) {
          case 0: //FF (finish-to-finish)
          case 1: //FS (finish-to-start)
            from = parseInt(gAtt(predecessorRow, "data-finish"), 10);
            break;
          case 2: //SF (start-to-finish)
          case 3: //SS (start-to-start)
            from = parseInt(gAtt(predecessorRow, "data-start"), 10);
            break;
          default:
        }
        switch (linkType) {
          case 0: //FF (finish-to-finish)
          case 2: //SF (start-to-finish)
            to = taskFinish;
            break;
          case 1: //FS (finish-to-start)
          case 3: //SS (start-to-start)
            to = taskStart;
            break;
          default:
        }
        var height = Math.abs(posRow.top - posPredecessorRow.top);
        linkEl.style.height = height + "px";
        var top = Math.min(posRow.top, posPredecessorRow.top);
        linkEl.style.top = parseInt(row.offsetHeight/2 + top, 10) + "px";
        var left, width;

        var xFrom, xTo;
        diff = from - projectDatesAndDimensions.startTime;
        xFrom = parseInt(projectDatesAndDimensions.width / projectDatesAndDimensions.screenMillis * diff, 10);

        diff = to - projectDatesAndDimensions.startTime;
        xTo = parseInt(projectDatesAndDimensions.width / projectDatesAndDimensions.screenMillis * diff, 10);

        var width = Math.abs(xTo - xFrom);
        if (from < to) {
          //task is right from its predecessor
          leftRight = "right";
          linkEl.style.left = (xFrom + 2) + "px";
          linkEl.style.width = width + "px";
          if (width < 9) {
//            linkEl.childNodes[2].style.left = width + "px";
//            linkEl.childNodes[2].style.right = (width - 9) + "px";
          }
        }
        else {
          //task is left from its predecessor
          leftRight = "left";
          linkEl.style.left = xTo + "px";
          linkEl.style.width = width + "px";
          if (width < 9) {
//            linkEl.childNodes[2].style.left = (width - 9) + "px";
//            linkEl.childNodes[2].style.left = width + "px";
          }
        }
        if (isNew) {
          linkEl.className += " task-predecessor-link-" + aboveBelow +
                            " task-predecessor-link-" + leftRight +
                            " task-predecessor-link-type" +
                            linkType + "-" + aboveBelow + "-" + leftRight
          ;
        }
      }
    });
  },
  getProjectDatesAndDimensions: function(){
    var gantTChart = this.getGantTChart();
    var mspDocument = gantTChart.getDocument();
    if (!mspDocument) return null;
    var boundaryDates = mspDocument.getBoundaryDates();
    var startDate = truncateDate(boundaryDates.minDate, "day");
    var finishDate = truncateDate(dateAdd(boundaryDates.maxDate, {days: 1}), "day");

    var ret = {
      width: this.getDom().offsetWidth - scrollbarWidth,
      startDate: startDate,
      startTime: startDate.getTime(),
      finishDate: finishDate,
      finishTime: finishDate.getTime(),
    };
    ret.projectMillis = ret.finishTime - ret.startTime;
    var screenMillis, resolution = this.getCalendarResolution();
    switch (resolution) {
      case "project":
        screenMillis = ret.projectMillis;
        //TODO: calculate extra time to account for space required by links.
        var extra = parseInt(30 * (screenMillis/ret.width), 10); //10 is extra width
        ret.startTime -= extra;
        ret.startDate = truncateDate(new Date(ret.startTime), "day");
        ret.startTime = ret.startDate.getTime();

        ret.finisTime += extra;
        ret.finishDate = truncateDate(dateAdd(new Date(ret.finishTime), {days: 1}), "day");
        ret.finishTime = ret.finishDate.getTime();

        screenMillis = ret.finishTime - ret.startTime;

        if (screenMillis > resolutionMillis.month) {
          resolution = "year";
        }
        else
        if (screenMillis > resolutionMillis.week) {
          resolution = "month";
        }
        else
        if (screenMillis > resolutionMillis.day) {
          resolution = "week";
        }
        else {
          resolution = "day";
        }
        break;
      case "year":
      case "month":
      case "week":
      case "day":
        screenMillis =  resolutionMillis[resolution];
        break;
    }
    ret.resolution = resolution;
    ret.screenMillis = screenMillis;
    return ret;
  },
  renderHeader: function(){
    var gantTChart = this.getGantTChart();
    var mspDocument = gantTChart.getDocument();
    if (!mspDocument) return;
    var baseCalendar = mspDocument.getBaseCalendar(),
        days = baseCalendar.WeekDays.WeekDay, day,
        weekStartDay = mspDocument.getWeekStartDay(),
        nonWorkingDays = {}
    ;
    if (!iArr(days)) days = [days];
    for (var i = 0; i < days.length; i++) {
      day = days[i];
      if (day.DayWorking === "0") {
        nonWorkingDays[parseInt(day.DayType, 10) - 1] = true;
      }
    }
    var projectDatesAndDimensions = this.getProjectDatesAndDimensions();
    var header = this.getHeader();

    var res, exitLoop = false, date, dateAddition, nextDate, num, label, l, w, diff, headerEl, baseClassName, className, isNonWorkingDay, id, year, month, day, color;
    for (res in resolutionMillis) {
      if (res === "week") continue;
      date = projectDatesAndDimensions.startDate;
      dateAddition = {};
      dateAddition[res + "s"] = 1;
      baseClassName = "gant-t-calendar-header-" + res;
      while (date.getTime() < projectDatesAndDimensions.finishTime) {
        nextDate = dateAdd(date, dateAddition);
        nextDate = truncateDate(nextDate, res);
        if (nextDate.getTime() === date.getTime()){
          alert("Whoops, our date truncation messed up. Bailing");
          return;
        }
        if (nextDate.getTime() > projectDatesAndDimensions.finishTime) {
          nextDate = projectDatesAndDimensions.finishDate;
        }
        diff = date.getTime() - projectDatesAndDimensions.startTime;
        l = parseInt(projectDatesAndDimensions.width / projectDatesAndDimensions.screenMillis * diff, 10);
        diff = nextDate.getTime() - projectDatesAndDimensions.startTime;
        w = parseInt(projectDatesAndDimensions.width / projectDatesAndDimensions.screenMillis * diff, 10);
        year = date.getUTCFullYear();
        month = date.getUTCMonth();
        day = date.getUTCDate();
        switch (res) {
          case "year":
            id = year;
            num = year;
            label = String(num);
            break;
          case "month":
            id = year + "-" + month;
            num = month;
            label = monthNames[num].substr(0,3);
            break;
          case "day":
            id = year + "-" + month + "-" + day;
            num = day;
            label = String(num);
            break;
        }
        id = "gant-t-calendar-header-" + id;
        headerEl = gEl(id);
        if (!headerEl) {
          switch (res) {
            case "year":
            case "month":
              className = "gant-t-calendar-header-" + res + "-" + (num % 2 === 0 ? "even" : "odd");
              break;
            case "day":
              var utcDay = date.getUTCDay();
              isNonWorkingDay = nonWorkingDays[utcDay] === true;
              className = "gant-t-calendar-header-day-" + (isNonWorkingDay ? "noworkday" : "workday") +
                          " gant-t-calendar-header-day-" + (utcDay === weekStartDay ? "weekstart" : "noweekstart")
              ;
              break;
          }
          headerEl = cEl("div", {
            "class":  "gant-t-calendar-header-item " + baseClassName + " " + className,
            id: id
          }, cEl("div", {
            "class": "label"
          }, label), header);

          if (res === "day") {
            headerEl.title = date.toDateString()
          }
        }
        headerEl.style.left = l + "px";
        headerEl.style.width = (w-l) + "px";
        if ((w - l) < 15) {
          color = "white";
        }
        else {
          color = "";
        }
        headerEl.firstChild.style.color = color;
        date = nextDate;
      }
    }
    var width = w+1;
    header.style.width = width + "px";
    this.getBodyTable().style.width = width + "px";
  },
  getHeader: function(){
    return this.header;
  },
  clearHeader: function(){
    var header = this.getHeader();
    if (!header) return;
    header.innerHTML = "";
  },
  getBodyTable: function(){
    return this.bodyTable;
  },
  getBody: function(){
    return this.body;
  },
  clearBodyTable: function(){
    var table = this.getBodyTable();
    var rows = table.rows;
    while (rows.length) {
      table.deleteRow(rows.length-1);
    }
  },
  clearLinks: function(){
    var table = this.getBodyTable();
    var body = this.getBody();
    while (body.childNodes.length > 1) {
      if (body.lastChild === table) return;
      body.removeChild(body.lastChild);
    }
  },
  clear: function(){
    this.clearHeader();
    this.clearBodyTable();
    this.clearLinks();
  },
  setCalendarResolution: function(calendarResolution){
    if (this.conf.calendarResolution === calendarResolution) return;
    var body = this.getBody();
    if (body) {
      if (calendarResolution === "project") {
        body.style.overflowX = "hidden";
      }
      else {
        body.style.overflowX = "auto";
      }
    }
    this.conf.calendarResolution = calendarResolution;
    this.renderHeader();
    this.renderTasks();
    this.updateCalendarHeight();
  },
  getCalendarResolution: function(){
    return this.conf.calendarResolution || "project";
  },
  widthChanged: function(){
    //var dom = this.getDom();
    //dom.style.overflow = "hidden";
    this.renderHeader();
    this.getBody().style.width = this.getDom().offsetWidth + "px";
    //dom.style.overflow = "auto";
    this.renderTasks();
    this.updateCalendarHeight();
  },
  hasHorizontalScrollBar: function(){
    var bodyTable = this.getBodyTable();
    var body = this.getBody();
    return bodyTable.offsetWidth > body.offsetWidth;
  },
  updateCalendarHeight: function(){
    var body = this.getBody();
    if (!body) return;
    var gantTChart = this.getGantTChart();
    var taskPane = gantTChart.getTaskPane();
    var borderBottomWidth;
    if (taskPane.attributesHasScrollbar()) {
      if (this.hasHorizontalScrollBar()) {
        borderBottomWidth = 0;
      }
      else {
        borderBottomWidth = scrollbarHeight;
      }
    }
    else {
      borderBottomWidth = 0;
    }
    body.style.borderBottomWidth = borderBottomWidth + "px";
  },
  addTask: function(task, index, suppressProjectSummaryTask){
    var gantTChart = this.getGantTChart();
    var mspDocument = gantTChart.getDocument();
    if (suppressProjectSummaryTask && index === 0) return;
    var bodyTable = this.getBodyTable();
    var rows = bodyTable.rows;
    var row = bodyTable.insertRow(rows.length);
    sAtts(row, {
      id: "calendarpane-row-" + task.UID,
      "data-WBS": task.WBS,
      "data-start": mspDocument.parseDate(task.Start),
      "data-finish": mspDocument.parseDate(task.Finish),
      "class": this.getTaskClassName(task)
    });

    var cell = row.insertCell(0);
    var children;
    if (task.Summary === "1" || task.Milestone === "1") {
      children = [
        cEl("div", {
          "class": "task-bar-left"
        }),
        cEl("div", {
          "class": "task-bar-right"
        })
      ]
    }
    else {
      children = [
        cEl("div", {
          "class": "task-bar-pct-complete",
          title: "Complete: " + task.PercentComplete + "%",
          style: {
            width: task.PercentComplete + "%"
          }
        }),
        cEl("div", {
          "class": "task-bar-pct-work-complete",
          title: "Work complete: " + task.PercentWorkComplete + "%",
          style: {
            width: task.PercentWorkComplete + "%"
          }
        }),
        cEl("div", {
          "class": "task-bar-physical-pct-complete",
          title: "Physical complete: " + task.PhysicalPercentComplete + "%",
          style: {
            width: task.PhysicalPercentComplete + "%"
          }
        })
      ];
    }
    cEl("div", {
      id: "task-bar-" + task.UID,
      "class": "task-bar",
      title: task.Name,
    }, children, cell);
    cEl("br", {}, null, cell);
  },
  tasksAdded: function(){
    this.updateCalendarHeight();
    this.renderTasks();
  },
  taskToggled: function(){
    this.updateCalendarHeight();
  },
};
adopt(GantTCalendarPane, GantTChartComponent);

(GantTTaskPane = function(conf){
  if (!conf) conf = {};
  if (!conf.classes) conf.classes = [];
  conf.classes = conf.classes.concat([
    "contentpane-noselect",
    GantTChart.prefix + "-contentpane",
    GantTChart.prefix + "-taskpane"
  ]);
  ContentPane.call(this, conf);
}).prototype = {
  getTaskTableHeader: function(){
    return this.taskTableHeader;
  },
  getTasks: function(){
    return this.tasks;
  },
  getTaskTable: function(){
    return this.taskTable;
  },
  createWBSDom: function(el){
    this.taskTableHeader = cEl("div", {
      "class": GantTChart.prefix + "-taskpane-tasks-header",
    }, "Tasks", el);
    this.taskTable = cEl("table", {
      "class": GantTChart.prefix + "-taskpane-tasks-table",
      cellpadding: 0,
      cellspacing: 0
    });
    listen(this.taskTable, "click", this.taskTableClickHandler, this);
    this.tasks = cEl("div", {
      "class": GantTChart.prefix + "-taskpane-tasks"
    }, this.taskTable, el);
  },
  taskTableClickHandler: function(ev){
    var target = ev.getTarget();
    if (!hCls(target, "task-toggle")) {
      return;
    }
    var cell = target.parentNode;
    var row = cell.parentNode;
    this.getGantTChart().toggleTask(row.rowIndex);
  },
  getAttributesHeader: function(){
    return this.attributesHeader;
  },
  getAttributesTable: function(){
    return this.attributesTable;
  },
  getAttributes: function(){
    return this.attributes;
  },
  createAttributesDom: function(el){
    this.attributesHeader = cEl("div", {
      "class": GantTChart.prefix + "-taskpane-attributes-header",
    }, null, el);

    this.attributesTable = cEl("table", {
      "class": GantTChart.prefix + "-taskpane-attributes-table",
      cellpadding: 0,
      cellspacing: 0
    });
    this.attributes = cEl("div", {
      "class": GantTChart.prefix + "-taskpane-attributes"
    }, this.attributesTable, el);
    this.renderAttributeHeaders();
    listen(this.attributes, "scroll", this.attributesScrollHandler, this);
  },
  attributesScrollHandler: function(event){
    var target = event.getTarget();
    var header = this.getAttributesHeader();
    var taskPane = this.getTasks();
    header.style.left = (taskPane.offsetWidth - target.scrollLeft) + "px";
  },
  createDom: function(){
    var el = ContentPane.prototype.createDom.call(this);
    this.createWBSDom(el);
    this.createAttributesDom(el);
    return el;
  },
  setGantTChart: function(gantTChart){
    this.gantTChart = gantTChart;
  },
  clearAttributesTable: function(){
    var table = this.getAttributesTable();
    var rows = table.rows;
    while (rows.length) {
      table.deleteRow(rows.length-1);
    }
  },
  clearTaskTable: function(){
    var table = this.getTaskTable();
    var rows = table.rows;
    while (rows.length) {
      table.deleteRow(rows.length-1);
    }
  },
  clear: function(){
    this.clearTaskTable();
    this.clearAttributesTable();
  },
  getConfiguredAttributes: function(){
    var gantTChart = this.getGantTChart();
    var conf = gantTChart.conf;
    return conf.configuredAttributes || {};
  },
  renderAttributeHeaders: function(){
    var header = this.getAttributesHeader();
    header.innerHTML = "";
    var configuredAttributes = this.getConfiguredAttributes();
    var configuredAttribute, configuredAttributeDef;
    var id;
    for (configuredAttribute in configuredAttributes) {
      configuredAttributeDef = configuredAttributes[configuredAttribute];
      id = "gant-t-chart-taskpane-attributes-header-item-" + configuredAttribute;
      cEl("div", {
        id: id,
        "class": id + " gant-t-chart-taskpane-attributes-header-item"
      }, configuredAttributeDef.label || configuredAttribute, header);
    }
    this.positionAttributeHeaders();
  },
  positionAttributeHeaders: function(){
    var attributesTable = this.getAttributesTable();
    var attributesRow = attributesTable.rows[0];
    var attributesCells = attributesRow ? attributesRow.cells : null;
    var header = this.getAttributesHeader();
    var configuredAttributes = this.getConfiguredAttributes();
    var configuredAttribute, configuredAttributeDef;
    var id, headerItem, attributeCell, attributeCellPos, columnIndex = 0;
    for (configuredAttribute in configuredAttributes) {
      configuredAttributeDef = configuredAttributes[configuredAttribute];
      id = "gant-t-chart-taskpane-attributes-header-item-" + configuredAttribute;
      headerItem = gEl(id);
      if (headerItem === null) continue;

      if (configuredAttributeDef.displayed === false) {
        headerItem.style.display = "none";
        continue;
      }

      if (attributesCells && columnIndex < attributesCells.length) {
        attributeCell = attributesCells[columnIndex];
        attributesCellPos = pos(attributeCell, attributesTable);
        headerItem.style.left = (attributesCellPos.left + 1 + columnIndex) + "px";
        headerItem.style.width = (attributeCell.clientWidth - 4) + "px";
      }
      else {
        headerItem.style.width = "";
      }
      columnIndex++;
    }
  },
  addTask: function(task, index, suppressProjectSummaryTask){
    if (suppressProjectSummaryTask && index === 0) return;
    var outlineLevel = parseInt(task.OutlineLevel, 10);
    var isNull = task.IsNull === "1";

    var taskTable = this.getTaskTable();
    var rows = taskTable.rows;
    var row = taskTable.insertRow(rows.length);

    var toggleState;
    if (task.Summary === "1") {
      toggleState = " task-expanded";
    }
    sAtts(row, {
      id: "taskpane-row-" + task.UID,
      "data-WBS": task.WBS,
      "data-OutlineLevel": outlineLevel,
      "class": this.getTaskClassName(task) + toggleState
    });

    var cell;
    cell = row.insertCell(row.cells.length);
    cell.className = "task-identity"
    cell.innerHTML = task.ID;
    cell = row.insertCell(row.cells.length);
    cell.className = "task-label";

    cEl("span", {
      "class": "task-toggle"
    }, String.fromCharCode(160), cell);
    cEl("label", {
      "class": "task-name"
    }, isNull ? String.fromCharCode(160) : task.Name, cell);

    if (suppressProjectSummaryTask) {
      //outlineLevel = outlineLevel - 1;
    }
    if (!isNaN(outlineLevel)) {
      cell.style.paddingLeft = outlineLevel + "em";
    }

    var attributesTable = this.getAttributesTable();
    var rows = attributesTable.rows;
    row = attributesTable.insertRow(rows.length);
    row.className = "task";
    var configuredAttributes = this.getConfiguredAttributes();
    var configuredAttribute, configuredAttributeDef, value;
    for (configuredAttribute in configuredAttributes) {
      configuredAttributeDef = configuredAttributes[configuredAttribute];
      if (configuredAttributeDef.displayed === false) continue;
      cell = row.insertCell(row.cells.length);
      value = task[configuredAttribute];
      //todo: format value
      if (configuredAttributeDef.formatter) {
        value = configuredAttributeDef.formatter(value);
      }
      cell.innerHTML = isNull ? "<br/>" : value;
    }
  },
  updateAttributesWidth: function(){
    var dom = this.getDom();
    var tasks = this.getTasks();
    var atts = this.getAttributes();
    var header = this.getAttributesHeader();

    atts.style.left = tasks.offsetWidth + "px";
    header.style.left = tasks.offsetWidth + "px";

    var width = dom.clientWidth - tasks.offsetWidth;
    atts.style.width = width + "px";
    header.style.width = width + "px";
  },
  attributesHasScrollbar: function() {
    var atts = this.getAttributes();
    if (!atts) return false;
    var attsTable = this.getAttributesTable();
    if (!attsTable) return false;
    return attsTable.offsetWidth > atts.clientWidth;
  },
  widthChanged: function(){
    this.updateAttributesWidth();
  },
  taskToggled: function(){
    this.updateTaskTableHeaderWidth();
    this.updateAttributesWidth();
    this.positionAttributeHeaders();
  },
  updateTaskTableHeaderWidth: function(){
    var taskTable = this.getTaskTable();
    var taskTableHeader = this.getTaskTableHeader();
    taskTableHeader.style.width = (taskTable.offsetWidth - 5) + "px";
  },
  tasksAdded: function(){
    this.updateTaskTableHeaderWidth();
    this.updateAttributesWidth();
    this.positionAttributeHeaders();
  },
  scroll: function(scrollLeft, scrollTop) {
    this.getTasks().style.top = (47 -scrollTop) + "px";
    this.getAttributes().style.top = (47 -scrollTop) + "px";
  }
};
adopt(GantTTaskPane, GantTChartComponent);

(GantTChart = function(conf){
  if (!conf) conf = {};
  if (!conf.classes) conf.classes = [];
  conf.classes.push(GantTChart.prefix + "-splitpane");
  conf.firstComponent = this.getTaskPane();
  conf.secondComponent = this.getCalendarPane();
  conf.orientation = SplitPane.orientations.vertical;
  if (!conf.calendarResolution) {
    conf.calendarResolution = "project";
  }
  if (!conf.splitterPositionChangedTimeout) {
    conf.splitterPositionChangedTimeout = GantTChart.splitterPositionChangedDefaultTimeout;
  }
  SplitPane.call(this, conf);
  this.setCalendarResolution(conf.calendarResolution);
  this.listen("splitterPositionChanged", this.timeSplitterPositionChanged, this);
}).prototype = {
  setCalendarResolution: function(resolution){
    this.getCalendarPane().setCalendarResolution(resolution);
  },
  toggleTask: function(rowIndex){
    var taskPane = this.getTaskPane(),
        taskTableRows = taskPane.getTaskTable().rows,
        attsRows = taskPane.getAttributesTable().rows,
        calendarPane = this.getCalendarPane(),
        calendarRows = calendarPane.getBodyTable().rows,
        row = taskTableRows[rowIndex],
        oL = parseInt(gAtt(row, "data-outlinelevel"), 10), rOl, prevRol = oL,
        r, i, n = taskTableRows.length, s, wbsStack = [],
        cls1, cls2
    ;
    //determine what toggle means (exapand or collapse);
    if (hCls(row, "task-expanded")) {
      cls1 = "task-expanded";
      cls2 = "task-collapsed";
    }
    else {
      cls1 = "task-collapsed";
      cls2 = "task-expanded";
    }
    rCls(row, cls1, cls2);
    //put the new state on the stack.
    wbsStack.push(cls2);

    for (i = rowIndex + 1; i < n; i++) {
      r = taskTableRows[i];
      rOl = parseInt(gAtt(r, "data-outlinelevel"), 10);

      //check of this task's outline level is less or same as toggled task.
      //If it is, we visited all descendants of the toggled task, and we can leave.
      if (rOl <= oL) {
        break;
      }

      //if the current outline level is less or same as previous,
      //then we can clear the stack for the descendant levels.
      //This ensures the scope of state is maintained.
      if (rOl <= prevRol) {
        wbsStack.length -= (prevRol-rOl) + 1;
      }

      //determine the style that fits the current
      s = (wbsStack[wbsStack.length - 1] === "task-collapsed") ? "none" : "";

      //set the style so as to hide/show rows.
      r.style.display = s;
      attsRows[i].style.display = s;
      calendarRows[i].style.display = s;

      if (wbsStack[wbsStack.length - 1] === "task-collapsed") {
        //if we are descendant of a task that is collapsed, then collapse.
        wbsStack.push("task-collapsed");
      }
      else {
        //if we are descendant of a task that is not collapsed, then...
        if (hCls(r, "task-collapsed")) {
          //if the current task is collapsed, push to stack to collapse its descendants
          wbsStack.push("task-collapsed");
        }
        else
        if (hCls(r, "task-expanded")) {
          //if the current task is expanded, pusth to stack so we can expand its descendants,
          //if applicable.
          wbsStack.push("task-expanded");
        }
        else {
          //if the current task is a leaf, push a state that is neither collapsed or expanded.
          wbsStack.push("");
        }
      }
      prevRol = rOl;
    }
    taskPane.taskToggled();
    calendarPane.taskToggled();
  },
  timeSplitterPositionChanged: function(){
    if (this.timeSplitterPositionChangedTimeout) {
      win.clearTimeout(this.timeSplitterPositionChangedTimeout);
    }
    var me = this;
    this.timeSplitterPositionChangedTimeout = win.setTimeout(function(){
      me.getTaskPane().widthChanged();
      var calendarPane = me.getCalendarPane();
      calendarPane.widthChanged();
      calendarPane.updateCalendarHeight();
    }, this.conf.splitterPositionChangedTimeout);
  },
  getTaskPane: function(){
    var taskPane = this.taskPane;
    if (!taskPane) {
      taskPane = new GantTTaskPane();
      taskPane.setGantTChart(this);
      this.taskPane = taskPane;
    }
    return taskPane;
  },
  getCalendarPane: function(){
    var calendarPane = this.calendarPane;
    if (!calendarPane) {
      calendarPane = new GantTCalendarPane();
      calendarPane.setGantTChart(this);
      this.calendarPane = calendarPane;
    }
    return calendarPane;
  },
  clear: function(){
    this.getTaskPane().clear();
    this.getCalendarPane().clear();
  },
  dontSuppressProjectSummaryTask: function(){
    return this.conf.suppressProjectSummaryTask === false;
  },
  refresh: function(){
    this.clear();
    var dontSuppressProjectSummaryTask = this.dontSuppressProjectSummaryTask();
    var taskPane = this.getTaskPane();
    var calendarPane = this.getCalendarPane();
    calendarPane.renderHeader();
    this.mspDocument.forEachTask(function(task, index) {
      taskPane.addTask(task, index, !dontSuppressProjectSummaryTask);
      calendarPane.addTask(task, index, !dontSuppressProjectSummaryTask);
    });
    taskPane.tasksAdded();
    calendarPane.tasksAdded();
  },
  setDocument: function(mspDocument){
    this.mspDocument = mspDocument;
    this.refresh();
  },
  getDocument: function(){
    return this.mspDocument;
  },
  scrolled: function(scrollLeft, scrollTop) {
    this.getCalendarPane().scroll(scrollLeft, scrollTop);
    this.getTaskPane().scroll(scrollLeft, scrollTop);
  }
};

GantTChart.splitterPositionChangedDefaultTimeout = 100;

adopt(GantTChart, SplitPane);

GantTChart.prefix = "gant-t-chart";
linkCss(cssDir + "ganttchart.css");
})();