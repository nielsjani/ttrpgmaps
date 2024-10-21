import { Component } from '@angular/core';
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-sword-coast-leuven-submap',
  templateUrl: './sword-coast-leuven-submap.component.html',
  styleUrls: ['./sword-coast-leuven-submap.component.scss']
})
export class SwordCoastLeuvenSubmapComponent {

  subMapId: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.subMapId = this.route.snapshot.paramMap.get('subMapId');
  }
}
