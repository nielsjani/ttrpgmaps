import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-wizard-progress-bar',
  templateUrl: './wizard-progress-bar.component.html',
  styleUrls: ['./wizard-progress-bar.component.scss']
})
export class WizardProgressBarComponent {

  @Input() currentStep: number = 0;

  steps = [
    '1. Start',
    '2. Class',
    '3. Background',
    '4. Species',
    '5. Abilities',
    '6. Equipment',
    '7. Finish'
  ]

}
