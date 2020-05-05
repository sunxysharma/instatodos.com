import { Component, OnInit, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
// import { MDCDialog } from '@material/dialog';
// import {MDCSwitch} from '@material/switch';
// import {MDCMenu} from '@material/menu';
import { TodoService } from '../../../service/todo/todo.service';
import { SharedService } from '../../../service/shared/shared.service';
import { TodoType, TodoLabelType, TodoConditions, OperationEnumType } from '../../../models/todo.model';

declare var $: any;
declare var flatpickr: any;

@Component({
  selector: 'app-todo-dialog',
  templateUrl: './todo-dialog.component.html',
  styleUrls: ['./todo-dialog.component.scss']
})
export class TodoDialogComponent implements OnInit, AfterViewInit {

  @Input()
  modelId = 'todo-dialog';
  @Input()
  todo: TodoType = null; // todo object if update
  @Input()
  conditions: TodoConditions = null; // conditions object
  @Input()
  origin = null;
  @Output()
  isOpen: EventEmitter<boolean> = new EventEmitter<boolean>(); // open flag
  // menu: MDCMenu; // mdc instance for label
  // menuPriority: MDCMenu; // mdc instance for priority
  title = 'Add Task';
  formObj: FormGroup;
  labels: TodoLabelType[]; // labels array
  // dialog: MDCDialog; // dialog instance
  priorityColor = this.todoService.getPriorities[3].color; // default color for priority
  priorities = [];
  TODOTYPES: any; // todo types wrt routes
  todoCurrentType: string; // current route
  operationType: OperationEnumType = 'ADD';
  currentLabel = '';
  labelIdVal: string[] = [];

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private todoService: TodoService,
    private sharedService: SharedService
  ) { }

  ngOnInit(): void {
    this.priorities = this.todoService.getPriorities;
    // checking labels if update
    this.labelIdVal = this.todo ? (this.todo.label.map(label => {
      return label._id;
    })) : [];
    // creating form
    this.formObj = this.fb.group({
      _id: [this.todo && this.todo._id || ''],
      title: [this.todo && this.todo.title, [Validators.required]],
      scheduling: [this.todo && this.todo.scheduledDate ? true : true],
      scheduledDate: [this.todo && this.todo.scheduledDate ? this.todo.scheduledDate : this.sharedService.todayDate()],
      labelId: [this.labelIdVal],
      priority: ['P4'],
      operationType: [this.operationType]
    }
    );
    // setting title
    if (this.todo) {
      this.title = 'Update Task';
      this.formObj.patchValue({
        _id: this.todo._id,
        priority: this.todo.priority,
        operationType: 'UPDATE'
      });
      this.priorityColor = this.todoService.getColor(this.formObj.value.priority);
    }
    // this.menu = new MDCMenu(document.querySelector('.mdc-menu-labels'));
    // this.menuPriority = new MDCMenu(document.querySelector('.mdc-menu-priority'));
    this.TODOTYPES = this.todoService.todoTypes(); // getting route types
    this.checkingRouteTypes(); // checking route types wrt current route
  }

  ngAfterViewInit() {
    if (typeof flatpickr !== 'undefined' && $.isFunction(flatpickr)) {
      $('.flatpicker').flatpickr({
          inline: true
      });
    }
    $('[data-toggle="tooltip"]').tooltip();
    const isOpenInstance = this.isOpen;
    // tslint:disable-next-line: only-arrow-functions
    $('#todo-dialog').on('hidden.bs.modal', function() {
      isOpenInstance.emit(false);
    });
  }

  /**
   * @description - use to check conditions wrt current route
   */
  checkingRouteTypes() {
    if (this.router.url === '/tasks/today') { // checking route if today
      this.todoCurrentType = this.TODOTYPES.today;
      this.formObj.patchValue({
        scheduling: true
      });
    } else if (this.router.url === '/tasks/completed') { // checking route if completed
      this.todoCurrentType = this.TODOTYPES.completed;
    } else if (this.router.url === '/tasks/inbox') { // checking route if inbox
      this.todoCurrentType = this.TODOTYPES.inbox;
    } else if (this.router.url === '/tasks/pending') { // checking route if inbox
      this.todoCurrentType = this.TODOTYPES.pending;
    }
    if (this.router.url.match('tasks/labels')) { // special case for labelled type
      const routerStrArr = this.router.url.split('/');
      const labelId = routerStrArr[routerStrArr.length - 2];
      this.todoCurrentType = labelId;
      this.conditions = this.todoService.getConditions(this.todoCurrentType);
      // populating label wrt route label
      if (this.todoCurrentType) {
        this.formObj.value.labelId.push(labelId);
        this.labelIdVal = this.formObj.value.labelId;
        this.getLabels(); // getting labels
      }
    } else {
      this.getLabels(); // getting labels
      this.conditions = this.todoService.getConditions(this.todoCurrentType); // default case for all types except labelled
    }
  }

  // open priority menu
  openPriority() {
    // this.menuPriority.open = true;
  }

  // set priority
  setPriority(priority: any) {
    this.formObj.patchValue({
      priority: priority.name
    });
    this.priorityColor = priority.color;
  }

  // open labels menu
  openLabels() {
   // this.menu.open = true;
  }

  // auto checked the labels if exist
  isChecked(labelId: string) {
    return this.formObj.value.labelId.indexOf(labelId) !== -1 ? true : false;
  }

  // check & uncheck labels
  checkLabels($event, label: any) {
    this.currentLabel = label.name;
    const labelId = label._id;
    const index = this.formObj.value.labelId.indexOf(labelId);
    if (index === -1) {
      this.formObj.value.labelId.push(labelId);
    } else {
      this.formObj.value.labelId.splice(index, 1);
    }
  }

  // fetching labels
  getLabels() {
    this.todoService
      .listTodoLabels()
      .subscribe(response => {
        this.labels = response;
        const filterLabel = this.labels.filter(item => item._id === this.labelIdVal[0]);
        if (filterLabel.length) {
          this.currentLabel = filterLabel[0].name;
        }
      });
  }

  isScheduling() {
    this.formObj.patchValue({
      scheduling: !this.formObj.value.scheduling
    });
  }

  // add/update the task
  submit() {
    if (this.formObj.valid) {
      const postBody = this.formObj.value;
      this.todoService
        .todoOperation(postBody, this.conditions)
        .subscribe(() => {
          // this.dialog.close();
          this.formObj.reset();
          this.isOpen.emit(false);
          $(`#${this.modelId}`).modal('hide');
        });
    }
  }
}
