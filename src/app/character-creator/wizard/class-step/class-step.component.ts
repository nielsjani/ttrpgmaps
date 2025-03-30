import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ClassData} from "../../data/class-data";


@Component({
  selector: 'app-class-step',
  templateUrl: './class-step.component.html',
  styleUrls: ['./class-step.component.scss']
})
export class ClassStepComponent {
  @Input() isFormSubmitted: boolean = false;
  @Output() formSubmitted = new EventEmitter<string>();

  presentClassSubClassSelection: boolean = false;
  chosenClass?: string;
  classes: any[] = ClassData.classes;

  submit(clazzId: string) {
    if (ClassData.hasFirstLevelChoice(clazzId)) {
      this.chosenClass = clazzId;
      this.presentClassSubClassSelection = true;
    } else {
      this.formSubmitted.emit(clazzId);
    }
  }
}
