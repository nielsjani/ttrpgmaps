import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormGroup, Validators} from "@angular/forms";
import {StartData} from "../../data/start-data";

@Component({
  selector: 'app-start-step',
  templateUrl: './start-step.component.html',
  styleUrls: ['./start-step.component.scss']
})
export class StartStepComponent {

  @Input()
  isFormSubmitted = false;
  @Input()
  characterForm!: FormGroup;
  @Output()
  formSubmitted: EventEmitter<StartData> = new EventEmitter;

  onSubmit(): void {
    this.isFormSubmitted = true;
    if (this.characterForm.invalid) {
      this.characterForm.markAsTouched()
    } else {
      this.formSubmitted.emit(this.characterForm.value);
    }
  }

}
