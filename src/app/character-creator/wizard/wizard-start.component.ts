// src/app/character-creator/wizard/wizard-start.component.ts
import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {CharacterDataService} from "../character-data.service";

@Component({
  selector: 'app-wizard-start',
  templateUrl: './wizard-start.component.html',
  styleUrls: ['./wizard-start.component.scss']
})
export class WizardStartComponent implements OnInit {
  characterForm!: FormGroup;
  currentStep: number = 0;
  isFormSubmitted: boolean = false;

  constructor(private fb: FormBuilder, private wizardService: CharacterDataService) {}

  ngOnInit(): void {
    this.characterForm = this.fb.group({
      name: ['', Validators.required],
      abilityScoreMethod: ['POINT_BUY', Validators.required]
    });
  }

  onSubmit(): void {
    this.isFormSubmitted = true;
    if (this.characterForm.invalid) {
      this.characterForm.markAsTouched()
    } else {
      this.wizardService.updateStartData(this.characterForm.value);
    }
  }
}
