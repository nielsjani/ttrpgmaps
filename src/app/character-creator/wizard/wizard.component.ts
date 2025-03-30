// src/app/character-creator/wizard/wizard-start.component.ts
import {Component, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {CharacterDataService} from "../character-data.service";
import {StartData} from "../data/start-data";
import {StartStepComponent} from "./start-step/start-step.component";

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {
  characterForm!: FormGroup;
  currentStep: number = 0;
  isFormSubmitted: boolean = false;

  @ViewChild(StartStepComponent) startStepComponent!: StartStepComponent;


  constructor(private fb: FormBuilder, private wizardService: CharacterDataService) {}

  ngOnInit(): void {
    this.characterForm = this.fb.group({
      name: ['', Validators.required],
      abilityScoreMethod: ['POINT_BUY', Validators.required]
    });
  }

  previousStep() {
    this.navigateToPreviousStep()
  }

  nextStep() {
    this.startStepComponent.onSubmit();
  }

  private navigateToPreviousStep() {
    this.currentStep--;
    this.isFormSubmitted = false;
  }

  private navigateToNextStep() {
    this.currentStep++;
    this.isFormSubmitted = false;
  }

  handleStartFormSubmit($event: StartData) {
    this.wizardService.updateStartData($event);
    this.navigateToNextStep();
  }

  handleClassChoice($event: string) {
    this.wizardService.updateClassChoice($event);
    this.navigateToNextStep();
  }
}
